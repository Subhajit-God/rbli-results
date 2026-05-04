import { useState } from "react";
import ExcelJS from "exceljs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  examId: string;
  examName?: string;
  onImported?: () => void;
}

const CLASSES = [5, 6, 7, 8, 9];
const HEADERS = [
  "Sl. No",
  "Student ID",
  "Roll No",
  "Student Name",
  "Father Name",
  "Mother Name",
  "Grand Total Marks",
  "Rank",
];
// Only the "Rank" column (8) is editable.
const EDITABLE_COL_INDEX = 8;

const RanksManualExcelImport = ({ examId, examName, onImported }: Props) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string[] | null>(null);

  const downloadTemplate = async () => {
    if (!examId) {
      toast({ variant: "destructive", title: "Select exam", description: "Pick an examination first." });
      return;
    }
    setBusy(true);
    try {
      // Fetch all students + ranks for this exam, group by class
      const { data: students, error: sErr } = await supabase
        .from("students")
        .select("id, student_id, name, father_name, mother_name, class_number, roll_number")
        .order("class_number")
        .order("roll_number");
      if (sErr) throw sErr;

      const { data: ranks, error: rErr } = await supabase
        .from("ranks")
        .select("student_id, total_marks, rank")
        .eq("exam_id", examId);
      if (rErr) throw rErr;

      const ranksByStudent: Record<string, { total: number; rank: number | null }> = {};
      (ranks || []).forEach((r: any) => {
        ranksByStudent[r.student_id] = { total: Number(r.total_marks) || 0, rank: r.rank };
      });

      const wb = new ExcelJS.Workbook();
      wb.creator = "RBLI";
      wb.created = new Date();

      for (const cls of CLASSES) {
        const ws = wb.addWorksheet(`Class ${cls}`, {
          views: [{ state: "frozen", ySplit: 1 }],
        });
        ws.addRow(HEADERS);
        const headerRow = ws.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE5E7EB" },
        };
        headerRow.alignment = { horizontal: "center", vertical: "middle" };

        const classStudents = (students || []).filter((s: any) => s.class_number === cls);
        classStudents.forEach((s: any, idx: number) => {
          const r = ranksByStudent[s.id];
          ws.addRow([
            idx + 1,
            s.student_id,
            s.roll_number,
            s.name,
            s.father_name,
            s.mother_name,
            r ? r.total : "",
            r?.rank ?? "",
          ]);
        });

        // Column widths
        [6, 14, 8, 28, 24, 24, 20, 10].forEach((w, i) => {
          ws.getColumn(i + 1).width = w;
        });

        // Lock everything except the Rank column.
        ws.getRows(2, classStudents.length)?.forEach((row) => {
          row.eachCell((cell, colNumber) => {
            cell.protection = { locked: colNumber !== EDITABLE_COL_INDEX };
          });
        });
        // Header is locked too.
        headerRow.eachCell((cell) => { cell.protection = { locked: true }; });

        // Note row
        const noteRow = ws.addRow([]);
        noteRow.getCell(1).value = "ⓘ Only the 'Rank' column is editable. Other fields are locked.";
        ws.mergeCells(noteRow.number, 1, noteRow.number, HEADERS.length);
        noteRow.getCell(1).font = { italic: true, color: { argb: "FF6B7280" } };
        noteRow.getCell(1).protection = { locked: true };

        // Enable sheet protection (no password — protection is advisory; server validates).
        await ws.protect("", {
          selectLockedCells: true,
          selectUnlockedCells: true,
          formatCells: false,
          formatColumns: false,
          formatRows: false,
          insertRows: false,
          insertColumns: false,
          deleteRows: false,
          deleteColumns: false,
          sort: false,
          autoFilter: false,
        });
      }

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Manual_Ranks_${(examName || "Exam").replace(/\s+/g, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Template downloaded", description: "Edit only the Rank column, then upload." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (file: File) => {
    if (!examId) {
      toast({ variant: "destructive", title: "Select exam", description: "Pick an examination first." });
      return;
    }
    setBusy(true);
    setReport(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("You must be signed in as an admin.");
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: auth.user.id });
      if (!isAdmin) throw new Error("Only administrators can update ranks.");

      const buf = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);

      // Build student lookup
      const { data: students, error: sErr } = await supabase
        .from("students")
        .select("id, student_id, class_number");
      if (sErr) throw sErr;
      const byKey: Record<string, string> = {};
      (students || []).forEach((s: any) => {
        byKey[`${s.class_number}|${s.student_id}`.toUpperCase()] = s.id;
      });

      const updates: { student_id: string; rank: number }[] = [];
      const issues: string[] = [];

      for (const cls of CLASSES) {
        const ws = wb.getWorksheet(`Class ${cls}`);
        if (!ws) {
          issues.push(`Sheet "Class ${cls}" missing — skipped.`);
          continue;
        }
        // Validate header
        const header = ws.getRow(1).values as any[];
        const headerOk = HEADERS.every((h, i) => String(header?.[i + 1] || "").trim() === h);
        if (!headerOk) {
          issues.push(`Class ${cls}: header row tampered — skipped.`);
          continue;
        }

        ws.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const sid = String(row.getCell(2).value ?? "").trim();
          const rankRaw = row.getCell(EDITABLE_COL_INDEX).value;
          if (!sid) return;
          if (rankRaw === null || rankRaw === undefined || rankRaw === "") return;
          const rankNum = parseInt(String(rankRaw), 10);
          if (!Number.isFinite(rankNum) || rankNum < 1) {
            issues.push(`Class ${cls} / ${sid}: invalid rank "${rankRaw}".`);
            return;
          }
          const studentUuid = byKey[`${cls}|${sid}`.toUpperCase()];
          if (!studentUuid) {
            issues.push(`Class ${cls} / ${sid}: student not found.`);
            return;
          }
          updates.push({ student_id: studentUuid, rank: rankNum });
        });

        // Detect duplicate ranks within this class
        const classStudentIds = new Set(
          (students || [])
            .filter((s: any) => s.class_number === cls)
            .map((s: any) => s.id)
        );
        const ranksInClass = updates
          .filter((u) => classStudentIds.has(u.student_id))
          .map((u) => u.rank);
        const dup = ranksInClass.find((r, i) => ranksInClass.indexOf(r) !== i);
        if (dup !== undefined) {
          issues.push(`Class ${cls}: duplicate rank "${dup}" detected.`);
        }
      }

      if (!updates.length) {
        throw new Error("No valid rank updates found in file.");
      }

      // Apply updates one by one (only rank + has_conflict=false; manually overridden)
      let ok = 0;
      for (const u of updates) {
        const { error } = await supabase
          .from("ranks")
          .update({ rank: u.rank, has_conflict: false })
          .eq("exam_id", examId)
          .eq("student_id", u.student_id);
        if (error) {
          issues.push(`Student ${u.student_id}: ${error.message}`);
        } else {
          ok++;
        }
      }

      await supabase.from("activity_logs").insert({
        action: "RANKS_MANUAL_EXCEL_IMPORT",
        details: { exam_id: examId, updated: ok, issues: issues.length },
      });

      setReport([`✓ Updated ${ok} rank(s).`, ...issues]);
      toast({
        title: "Import complete",
        description: `${ok} updated${issues.length ? `, ${issues.length} issue(s)` : ""}.`,
      });
      onImported?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Import failed", description: e.message });
      setReport([`✗ ${e.message}`]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-5 w-5" /> Manual Rank Entry via Excel
        </CardTitle>
        <CardDescription>
          One workbook with 5 sheets (Class 5–9). Only the <strong>Rank</strong> column is editable;
          all other fields are locked. Edit ranks in Excel, then upload to apply.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadTemplate} disabled={busy || !examId} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Download Template
          </Button>
          <label>
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              disabled={busy || !examId}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.currentTarget.value = "";
                if (f) onUpload(f);
              }}
            />
            <Button asChild disabled={busy || !examId}>
              <span><Upload className="mr-2 h-4 w-4" /> Upload Filled File</span>
            </Button>
          </label>
        </div>
        {!examId && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Select an examination above to enable the template.</AlertDescription>
          </Alert>
        )}
        {report && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-5 space-y-0.5 text-sm">
                {report.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default RanksManualExcelImport;

import { useState } from "react";
import ExcelJS from "exceljs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
} from "lucide-react";
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
const EDITABLE_COL_INDEX = 8; // Only "Rank" is editable

interface PreviewRow {
  slNo: number;
  studentId: string;
  rollNo: string;
  name: string;
  father: string;
  mother: string;
  total: string;
  rank: string;
  rankNum: number | null;
  studentUuid: string | null;
  error?: string;
}

interface ClassPreview {
  cls: number;
  rows: PreviewRow[];
  duplicateRanks: number[];
  sheetMissing: boolean;
  headerInvalid: boolean;
}

const RanksManualExcelImport = ({ examId, examName, onImported }: Props) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ClassPreview[] | null>(null);
  const [report, setReport] = useState<string[] | null>(null);

  const downloadTemplate = async () => {
    if (!examId) {
      toast({ variant: "destructive", title: "Select exam", description: "Pick an examination first." });
      return;
    }
    setBusy(true);
    try {
      const { data: students, error: sErr } = await supabase
        .from("students")
        .select("id, student_id, name, father_name, mother_name, class_number, roll_number")
        .order("class_number")
        .order("roll_number");
      if (sErr) throw sErr;

      const { data: ranks, error: rErr } = await supabase
        .from("ranks")
        .select("student_id, total_marks")
        .eq("exam_id", examId);
      if (rErr) throw rErr;

      const totalsByStudent: Record<string, number> = {};
      (ranks || []).forEach((r: any) => {
        const t = Number(r.total_marks);
        if (Number.isFinite(t) && t > 0) totalsByStudent[r.student_id] = t;
      });

      // Fallback: compute totals directly from marks table for any student
      // who doesn't have a ranks row yet (or whose total is 0).
      const { data: marksRows, error: mErr } = await supabase
        .from("marks")
        .select("student_id, marks_1, marks_2, marks_3")
        .eq("exam_id", examId);
      if (mErr) throw mErr;

      const toNum = (v: any) => {
        if (v === null || v === undefined) return 0;
        const s = String(v).trim().toUpperCase();
        if (s === "" || s === "AB" || s === "EX" || s === "—") return 0;
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : 0;
      };
      const computed: Record<string, number> = {};
      (marksRows || []).forEach((m: any) => {
        const sum = toNum(m.marks_1) + toNum(m.marks_2) + toNum(m.marks_3);
        computed[m.student_id] = (computed[m.student_id] || 0) + sum;
      });
      Object.keys(computed).forEach((sid) => {
        if (!totalsByStudent[sid]) totalsByStudent[sid] = computed[sid];
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
          // Every cell must be filled — fall back to "—" so no blanks remain.
          // Only the Rank column is intentionally left empty for the admin to fill.
          const total = totalsByStudent[s.id];
          ws.addRow([
            idx + 1,
            s.student_id || "—",
            s.roll_number ?? "—",
            s.name || "—",
            s.father_name || "—",
            s.mother_name || "—",
            total !== undefined ? total : 0,
            "", // Rank — blank for admin to write
          ]);
        });

        [6, 14, 8, 28, 24, 24, 20, 10].forEach((w, i) => {
          ws.getColumn(i + 1).width = w;
        });

        // Lock everything except the Rank column on data rows.
        ws.getRows(2, classStudents.length)?.forEach((row) => {
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.protection = { locked: colNumber !== EDITABLE_COL_INDEX };
          });
          // Ensure rank cell is unlocked even if empty
          row.getCell(EDITABLE_COL_INDEX).protection = { locked: false };
        });
        headerRow.eachCell((cell) => {
          cell.protection = { locked: true };
        });

        const noteRow = ws.addRow([]);
        noteRow.getCell(1).value =
          "ⓘ Only the 'Rank' column is editable. All other fields are pre-filled and locked.";
        ws.mergeCells(noteRow.number, 1, noteRow.number, HEADERS.length);
        noteRow.getCell(1).font = { italic: true, color: { argb: "FF6B7280" } };
        noteRow.getCell(1).protection = { locked: true };

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
      toast({ title: "Template downloaded", description: "Fill the Rank column, then upload to preview." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const buildPreview = async (file: File) => {
    setBusy(true);
    setReport(null);
    setPreview(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);

      const { data: students, error: sErr } = await supabase
        .from("students")
        .select("id, student_id, class_number");
      if (sErr) throw sErr;
      const byKey: Record<string, string> = {};
      (students || []).forEach((s: any) => {
        byKey[`${s.class_number}|${s.student_id}`.toUpperCase()] = s.id;
      });

      const previews: ClassPreview[] = [];

      for (const cls of CLASSES) {
        const ws = wb.getWorksheet(`Class ${cls}`);
        const cp: ClassPreview = {
          cls,
          rows: [],
          duplicateRanks: [],
          sheetMissing: !ws,
          headerInvalid: false,
        };
        if (!ws) {
          previews.push(cp);
          continue;
        }
        const header = ws.getRow(1).values as any[];
        cp.headerInvalid = !HEADERS.every(
          (h, i) => String(header?.[i + 1] || "").trim() === h
        );
        if (cp.headerInvalid) {
          previews.push(cp);
          continue;
        }

        ws.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const slNo = row.getCell(1).value;
          const sid = String(row.getCell(2).value ?? "").trim();
          if (!sid || sid === "—") return; // skip note row / blanks

          const rankRaw = row.getCell(EDITABLE_COL_INDEX).value;
          const rankStr =
            rankRaw === null || rankRaw === undefined ? "" : String(rankRaw).trim();
          let rankNum: number | null = null;
          let error: string | undefined;

          if (rankStr !== "") {
            const n = parseInt(rankStr, 10);
            if (!Number.isFinite(n) || n < 1) {
              error = `Invalid rank "${rankStr}"`;
            } else {
              rankNum = n;
            }
          }

          const studentUuid = byKey[`${cls}|${sid}`.toUpperCase()] || null;
          if (!studentUuid && !error) {
            error = "Student not found in database";
          }

          cp.rows.push({
            slNo: Number(slNo) || cp.rows.length + 1,
            studentId: sid,
            rollNo: String(row.getCell(3).value ?? ""),
            name: String(row.getCell(4).value ?? ""),
            father: String(row.getCell(5).value ?? ""),
            mother: String(row.getCell(6).value ?? ""),
            total: String(row.getCell(7).value ?? ""),
            rank: rankStr,
            rankNum,
            studentUuid,
            error,
          });
        });

        // Duplicate-rank detection within class
        const ranksInClass = cp.rows
          .map((r) => r.rankNum)
          .filter((r): r is number => r !== null);
        const seen = new Set<number>();
        const dups = new Set<number>();
        ranksInClass.forEach((r) => {
          if (seen.has(r)) dups.add(r);
          seen.add(r);
        });
        cp.duplicateRanks = Array.from(dups);
        cp.rows.forEach((r) => {
          if (r.rankNum !== null && cp.duplicateRanks.includes(r.rankNum) && !r.error) {
            r.error = `Duplicate rank ${r.rankNum}`;
          }
        });

        previews.push(cp);
      }

      setPreview(previews);
      toast({
        title: "Preview ready",
        description: "Review the parsed rows below, then click Apply to save.",
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Parse failed", description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const applyPreview = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("You must be signed in as an admin.");
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: auth.user.id });
      if (!isAdmin) throw new Error("Only administrators can update ranks.");

      const updates: { student_id: string; rank: number }[] = [];
      const issues: string[] = [];

      preview.forEach((cp) => {
        if (cp.sheetMissing) {
          issues.push(`Class ${cp.cls}: sheet missing — skipped.`);
          return;
        }
        if (cp.headerInvalid) {
          issues.push(`Class ${cp.cls}: header tampered — skipped.`);
          return;
        }
        cp.rows.forEach((r) => {
          if (r.error || r.rankNum === null || !r.studentUuid) return;
          updates.push({ student_id: r.studentUuid, rank: r.rankNum });
        });
      });

      if (!updates.length) {
        throw new Error("No valid rank updates found. Resolve errors above and re-upload.");
      }

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
      setPreview(null);
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

  // Aggregate counts for summary
  const summary = preview
    ? preview.reduce(
        (acc, cp) => {
          if (cp.sheetMissing || cp.headerInvalid) return acc;
          cp.rows.forEach((r) => {
            acc.total++;
            if (r.error) acc.errors++;
            else if (r.rankNum !== null) acc.toApply++;
            else acc.empty++;
          });
          return acc;
        },
        { total: 0, errors: 0, toApply: 0, empty: 0 }
      )
    : null;

  const firstClassWithRows = preview?.find((p) => p.rows.length > 0)?.cls?.toString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-5 w-5" /> Manual Rank Entry via Excel
        </CardTitle>
        <CardDescription>
          One workbook with 5 sheets (Class 5–9). Every cell is pre-filled; only the{" "}
          <strong>Rank</strong> column is blank and editable. Upload to preview first, then apply.
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
                if (f) buildPreview(f);
              }}
            />
            <Button asChild disabled={busy || !examId} variant="secondary">
              <span>
                <Eye className="mr-2 h-4 w-4" /> Upload & Preview
              </span>
            </Button>
          </label>
          {preview && (
            <>
              <Button
                onClick={applyPreview}
                disabled={busy || !summary || summary.toApply === 0}
              >
                <Upload className="mr-2 h-4 w-4" /> Apply {summary?.toApply || 0} Rank
                {(summary?.toApply || 0) === 1 ? "" : "s"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPreview(null);
                  setReport(null);
                }}
                disabled={busy}
              >
                <X className="mr-2 h-4 w-4" /> Clear Preview
              </Button>
            </>
          )}
        </div>

        {!examId && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Select an examination above to enable the template.</AlertDescription>
          </Alert>
        )}

        {/* Preview summary */}
        {preview && summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Total rows</p>
              <p className="text-xl font-bold">{summary.total}</p>
            </div>
            <div className="rounded-lg border border-success/30 p-3 bg-success/10">
              <p className="text-xs text-muted-foreground">To apply</p>
              <p className="text-xl font-bold text-success">{summary.toApply}</p>
            </div>
            <div className="rounded-lg border border-warning/30 p-3 bg-warning/10">
              <p className="text-xs text-muted-foreground">Empty rank</p>
              <p className="text-xl font-bold text-warning">{summary.empty}</p>
            </div>
            <div className="rounded-lg border border-destructive/30 p-3 bg-destructive/10">
              <p className="text-xs text-muted-foreground">Errors</p>
              <p className="text-xl font-bold text-destructive">{summary.errors}</p>
            </div>
          </div>
        )}

        {/* Class-level alerts */}
        {preview?.map(
          (cp) =>
            (cp.sheetMissing || cp.headerInvalid) && (
              <Alert key={`alert-${cp.cls}`} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Class {cp.cls}:{" "}
                  {cp.sheetMissing ? "sheet missing" : "header row tampered"} — this class will be skipped.
                </AlertDescription>
              </Alert>
            )
        )}

        {/* Per-class preview tables */}
        {preview && firstClassWithRows && (
          <Tabs defaultValue={firstClassWithRows} className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              {preview.map((cp) => {
                const errCount = cp.rows.filter((r) => r.error).length;
                return (
                  <TabsTrigger key={cp.cls} value={String(cp.cls)} className="relative text-xs">
                    Cls {cp.cls}
                    {errCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] h-4 min-w-4 px-1">
                        {errCount}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {preview.map((cp) => (
              <TabsContent key={cp.cls} value={String(cp.cls)}>
                {cp.rows.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No rows for Class {cp.cls}.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border max-h-[50vh]">
                    <Table className="min-w-[760px]">
                      <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow>
                          <TableHead className="w-12">Sl</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead className="w-16">Roll</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-center w-20">Total</TableHead>
                          <TableHead className="text-center w-20">Rank</TableHead>
                          <TableHead className="w-48">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cp.rows.map((r, i) => (
                          <TableRow
                            key={`${cp.cls}-${i}`}
                            className={
                              r.error
                                ? "bg-destructive/10"
                                : r.rankNum !== null
                                  ? "bg-success/5"
                                  : ""
                            }
                          >
                            <TableCell>{r.slNo}</TableCell>
                            <TableCell className="font-mono text-xs">{r.studentId}</TableCell>
                            <TableCell>{r.rollNo}</TableCell>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell className="text-center">{r.total}</TableCell>
                            <TableCell className="text-center font-bold">
                              {r.rank || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {r.error ? (
                                <Badge variant="outline" className="border-destructive text-destructive text-[10px]">
                                  <AlertTriangle className="mr-1 h-3 w-3" /> {r.error}
                                </Badge>
                              ) : r.rankNum !== null ? (
                                <Badge variant="outline" className="border-success text-success text-[10px]">
                                  <CheckCircle className="mr-1 h-3 w-3" /> Will apply
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                  Empty (skipped)
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {report && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-5 space-y-0.5 text-sm">
                {report.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default RanksManualExcelImport;

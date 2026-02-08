import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

interface Subject {
  id: string;
  name: string;
  class_number: number;
  full_marks_1: number;
  full_marks_2: number;
  full_marks_3: number;
  display_order: number | null;
}

interface Student {
  id: string;
  student_id: string;
  name: string;
  roll_number: number;
}

interface ParsedStudentMarks {
  rowNumber: number;
  student_id: string;
  roll_number: number;
  student_name: string;
  internal_student_id?: string;
  subjects: {
    subject_id: string;
    subject_name: string;
    marks_1: string;
    marks_2: string;
    marks_3: string;
    errors: string[];
  }[];
  globalErrors: string[];
  isValid: boolean;
}

interface Exam {
  id: string;
  name: string;
  academic_year: string;
}

interface BulkMarksExcelImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
  examId: string;
  exam: Exam;
  classNumber: number;
  subjects: Subject[];
  isDeploymentActive: boolean;
}

type MarkFieldOption = 'marks_1' | 'marks_2' | 'marks_3' | 'all';

const BulkMarksExcelImport = ({
  open,
  onOpenChange,
  onImportSuccess,
  examId,
  exam,
  classNumber,
  subjects,
  isDeploymentActive,
}: BulkMarksExcelImportProps) => {
  const [selectedMarkField, setSelectedMarkField] = useState<MarkFieldOption>('all');
  const [parsedData, setParsedData] = useState<ParsedStudentMarks[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const sortedSubjects = [...subjects].sort((a, b) => 
    (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  const validRows = parsedData.filter((r) => r.isValid);
  const invalidRows = parsedData.filter((r) => !r.isValid);

  const getFieldLabel = (field: MarkFieldOption) => {
    if (field === 'marks_1') return 'Summative I';
    if (field === 'marks_2') return 'Summative II';
    if (field === 'marks_3') return 'Summative III';
    return 'All Summatives';
  };

  const getExpectedColumns = () => {
    const baseColumns = ["STUDENT ID", "ROLL", "STUDENT NAME"];
    
    if (selectedMarkField === 'all') {
      // For each subject: Subject_I, Subject_II, Subject_III
      const subjectColumns: string[] = [];
      sortedSubjects.forEach(subject => {
        subjectColumns.push(`${subject.name.toUpperCase()}_I`);
        subjectColumns.push(`${subject.name.toUpperCase()}_II`);
        subjectColumns.push(`${subject.name.toUpperCase()}_III`);
      });
      return [...baseColumns, ...subjectColumns];
    } else {
      // For single summative: just subject names
      return [...baseColumns, ...sortedSubjects.map(s => s.name.toUpperCase())];
    }
  };

  const downloadTemplate = async () => {
    // Fetch students for this class
    const { data: students, error } = await supabase
      .from("students")
      .select("student_id, name, roll_number")
      .eq("class_number", classNumber)
      .order("roll_number");

    if (error || !students) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch students for template",
      });
      return;
    }

    let headers: string[];
    let templateData: (string | number)[][];

    if (selectedMarkField === 'all') {
      // Headers: Student ID, Roll, Name, then for each subject: Subject_I, Subject_II, Subject_III
      headers = ["STUDENT ID", "ROLL", "STUDENT NAME"];
      sortedSubjects.forEach(subject => {
        headers.push(`${subject.name.toUpperCase()}_I (FM:${subject.full_marks_1})`);
        headers.push(`${subject.name.toUpperCase()}_II (FM:${subject.full_marks_2})`);
        headers.push(`${subject.name.toUpperCase()}_III (FM:${subject.full_marks_3})`);
      });

      templateData = [
        headers,
        ...students.map((s) => {
          const row: (string | number)[] = [s.student_id, s.roll_number, s.name];
          sortedSubjects.forEach(() => {
            row.push("", "", ""); // Empty marks for I, II, III
          });
          return row;
        }),
      ];
    } else {
      // Single summative mode
      const fieldNum = selectedMarkField === 'marks_1' ? 1 : selectedMarkField === 'marks_2' ? 2 : 3;
      headers = ["STUDENT ID", "ROLL", "STUDENT NAME"];
      sortedSubjects.forEach(subject => {
        const fullMarks = selectedMarkField === 'marks_1' 
          ? subject.full_marks_1 
          : selectedMarkField === 'marks_2' 
            ? subject.full_marks_2 
            : subject.full_marks_3;
        headers.push(`${subject.name.toUpperCase()} (FM:${fullMarks})`);
      });

      templateData = [
        headers,
        ...students.map((s) => {
          const row: (string | number)[] = [s.student_id, s.roll_number, s.name];
          sortedSubjects.forEach(() => {
            row.push(""); // Empty marks
          });
          return row;
        }),
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Auto-size columns
    const colWidths = headers.map(h => ({ wch: Math.max(15, h.length + 2) }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bulk Marks");
    
    const fieldLabel = selectedMarkField === 'all' ? 'AllSubjects' : getFieldLabel(selectedMarkField).replace(' ', '');
    const fileName = `BulkMarks_${exam.academic_year}_Class${classNumber}_${fieldLabel}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const validateMarksValue = (
    value: string,
    fullMarks: number
  ): { valid: boolean; error?: string } => {
    const trimmed = value.trim().toUpperCase();
    
    if (trimmed === "") {
      return { valid: true }; // Empty is allowed (skip)
    }
    
    if (trimmed === "AB" || trimmed === "EX") {
      return { valid: true }; // Valid special values
    }
    
    const numMarks = parseFloat(trimmed);
    if (isNaN(numMarks)) {
      return { valid: false, error: "Must be number, AB, or EX" };
    }
    if (numMarks < 0) {
      return { valid: false, error: "Cannot be negative" };
    }
    if (numMarks > fullMarks) {
      return { valid: false, error: `Exceeds FM (${fullMarks})` };
    }
    
    return { valid: true };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setIsProcessing(true);
    setParsedData([]);

    try {
      // Fetch students for validation
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, student_id, name, roll_number")
        .eq("class_number", classNumber);

      if (studentsError) throw studentsError;

      const studentsMap = new Map(
        students?.map((s) => [s.student_id, { id: s.id, roll: s.roll_number, name: s.name }]) || []
      );

      // Read Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Parse rows
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        setFileError("The Excel file is empty. Please add marks data.");
        setIsProcessing(false);
        return;
      }

      // Get header row to find subject columns
      const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
      const headerRow: string[] = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
        headerRow.push(cell ? String(cell.v).trim() : "");
      }

      // Parse each row
      const parsed: ParsedStudentMarks[] = jsonData.map((row: any, index) => {
        const globalErrors: string[] = [];
        
        const student_id = String(row["STUDENT ID"] || "").trim();
        const roll_number = parseInt(String(row["ROLL"] || "0"));
        const student_name = String(row["STUDENT NAME"] || "").trim();

        // Validate student exists
        const student = studentsMap.get(student_id);
        if (!student) {
          globalErrors.push("Student ID not found");
        }

        // Parse marks for each subject
        const subjectMarks: ParsedStudentMarks["subjects"] = [];
        
        sortedSubjects.forEach(subject => {
          const subjectErrors: string[] = [];
          let marks_1 = "";
          let marks_2 = "";
          let marks_3 = "";

          if (selectedMarkField === 'all') {
            // Look for Subject_I, Subject_II, Subject_III columns
            // Try multiple naming patterns
            const findColumn = (suffix: string) => {
              const patterns = [
                `${subject.name.toUpperCase()}_${suffix}`,
                `${subject.name}_${suffix}`,
                `${subject.name.toUpperCase()}_${suffix} (FM:${suffix === 'I' ? subject.full_marks_1 : suffix === 'II' ? subject.full_marks_2 : subject.full_marks_3})`,
              ];
              for (const pattern of patterns) {
                for (const key of Object.keys(row)) {
                  if (key.toUpperCase().startsWith(pattern.toUpperCase().split(' ')[0])) {
                    return String(row[key] || "").trim().toUpperCase();
                  }
                }
              }
              return "";
            };

            marks_1 = findColumn('I');
            marks_2 = findColumn('II');
            marks_3 = findColumn('III');

            // Validate marks
            const m1Val = validateMarksValue(marks_1, subject.full_marks_1);
            if (!m1Val.valid) subjectErrors.push(`I: ${m1Val.error}`);
            
            const m2Val = validateMarksValue(marks_2, subject.full_marks_2);
            if (!m2Val.valid) subjectErrors.push(`II: ${m2Val.error}`);
            
            const m3Val = validateMarksValue(marks_3, subject.full_marks_3);
            if (!m3Val.valid) subjectErrors.push(`III: ${m3Val.error}`);
          } else {
            // Single summative mode - look for subject name column
            const fullMarks = selectedMarkField === 'marks_1' 
              ? subject.full_marks_1 
              : selectedMarkField === 'marks_2' 
                ? subject.full_marks_2 
                : subject.full_marks_3;

            // Find the column
            let marksValue = "";
            for (const key of Object.keys(row)) {
              if (key.toUpperCase().startsWith(subject.name.toUpperCase())) {
                marksValue = String(row[key] || "").trim().toUpperCase();
                break;
              }
            }

            if (selectedMarkField === 'marks_1') marks_1 = marksValue;
            else if (selectedMarkField === 'marks_2') marks_2 = marksValue;
            else marks_3 = marksValue;

            const mVal = validateMarksValue(marksValue, fullMarks);
            if (!mVal.valid) subjectErrors.push(mVal.error || "Invalid");
          }

          subjectMarks.push({
            subject_id: subject.id,
            subject_name: subject.name,
            marks_1,
            marks_2,
            marks_3,
            errors: subjectErrors,
          });
        });

        // Check if at least one subject has marks
        const hasAnyMarks = subjectMarks.some(sm => 
          sm.marks_1 !== "" || sm.marks_2 !== "" || sm.marks_3 !== ""
        );

        const hasSubjectErrors = subjectMarks.some(sm => sm.errors.length > 0);

        return {
          rowNumber: index + 2,
          student_id,
          roll_number,
          student_name,
          internal_student_id: student?.id,
          subjects: subjectMarks,
          globalErrors,
          isValid: globalErrors.length === 0 && !hasSubjectErrors && hasAnyMarks,
        };
      });

      setParsedData(parsed);
    } catch (error) {
      console.error("Error parsing file:", error);
      setFileError("Could not read the Excel file. Please ensure it's a valid .xlsx file.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      // Prepare upsert data - one record per student per subject
      const marksToUpsert: {
        student_id: string;
        subject_id: string;
        exam_id: string;
        marks_1: string | null;
        marks_2: string | null;
        marks_3: string | null;
        is_locked: boolean;
      }[] = [];

      validRows.forEach(row => {
        row.subjects.forEach(subjectMark => {
          // Only include if there's at least one mark
          if (subjectMark.marks_1 !== "" || subjectMark.marks_2 !== "" || subjectMark.marks_3 !== "") {
            marksToUpsert.push({
              student_id: row.internal_student_id!,
              subject_id: subjectMark.subject_id,
              exam_id: examId,
              marks_1: subjectMark.marks_1 || null,
              marks_2: subjectMark.marks_2 || null,
              marks_3: subjectMark.marks_3 || null,
              is_locked: false,
            });
          }
        });
      });

      if (marksToUpsert.length === 0) {
        toast({
          variant: "destructive",
          title: "No Marks to Import",
          description: "No valid marks data found.",
        });
        return;
      }

      // Upsert in batches
      const batchSize = 100;
      for (let i = 0; i < marksToUpsert.length; i += batchSize) {
        const batch = marksToUpsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from("marks")
          .upsert(batch, { onConflict: "student_id,subject_id,exam_id" });

        if (error) throw error;
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        action: "BULK_MARKS_IMPORTED",
        details: {
          exam_id: examId,
          class: classNumber,
          students_count: validRows.length,
          marks_count: marksToUpsert.length,
          subjects_count: subjects.length,
          field: selectedMarkField,
        },
      });

      toast({
        title: "Import Successful",
        description: `Imported marks for ${validRows.length} students across ${subjects.length} subjects`,
      });

      onImportSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "Failed to import marks",
      });
    } finally {
      setIsImporting(false);
      setShowConfirmDialog(false);
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setFileError(null);
    setSelectedMarkField('all');
    onOpenChange(false);
  };

  const totalMarksToImport = validRows.reduce((acc, row) => {
    return acc + row.subjects.filter(s => s.marks_1 || s.marks_2 || s.marks_3).length;
  }, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Bulk Marks Import - All Subjects
            </DialogTitle>
            <DialogDescription>
              Import marks for all subjects of Class {classNumber} at once via Excel.
              {exam && ` (${exam.name} - ${exam.academic_year})`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Summative Selection */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Import Mode</Label>
                <Select 
                  value={selectedMarkField} 
                  onValueChange={(v) => setSelectedMarkField(v as MarkFieldOption)}
                  disabled={parsedData.length > 0}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Summatives (I, II, III)</SelectItem>
                    <SelectItem value="marks_1">Summative I Only</SelectItem>
                    <SelectItem value="marks_2">Summative II Only</SelectItem>
                    <SelectItem value="marks_3">Summative III Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-6">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </div>

            {/* Subject Info */}
            <Alert className="bg-muted/50">
              <AlertDescription className="text-sm">
                <strong>Subjects in Class {classNumber}:</strong>{" "}
                {sortedSubjects.map(s => s.name).join(", ")}
              </AlertDescription>
            </Alert>

            {/* File Upload */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col items-center gap-4 py-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="bulk-excel-upload"
                  />
                  <label
                    htmlFor="bulk-excel-upload"
                    className="flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors w-full"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {isProcessing ? "Processing..." : "Click to upload Excel file or drag and drop"}
                    </span>
                  </label>

                  {fileError && (
                    <Alert variant="destructive" className="w-full">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{fileError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Parsed Data Summary */}
            {parsedData.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Parsed Data ({parsedData.length} rows)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <Badge variant="default" className="bg-success text-success-foreground">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Valid: {validRows.length}
                    </Badge>
                    {invalidRows.length > 0 && (
                      <Badge variant="destructive">
                        <X className="mr-1 h-3 w-3" />
                        Invalid: {invalidRows.length}
                      </Badge>
                    )}
                  </div>

                  {invalidRows.length > 0 && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {invalidRows.length} row(s) have errors and will be skipped. Fix them and re-upload for complete import.
                      </AlertDescription>
                    </Alert>
                  )}

                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Row</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Roll</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.map((row) => (
                          <TableRow key={row.rowNumber} className={row.isValid ? "" : "bg-destructive/10"}>
                            <TableCell>{row.rowNumber}</TableCell>
                            <TableCell className="font-medium">{row.student_name}</TableCell>
                            <TableCell>{row.roll_number}</TableCell>
                            <TableCell>
                              {row.isValid ? (
                                <Badge variant="outline" className="text-success border-success">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Valid
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <X className="mr-1 h-3 w-3" />
                                  Error
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.globalErrors.length > 0 && (
                                <span className="text-destructive">{row.globalErrors.join(", ")}</span>
                              )}
                              {row.subjects
                                .filter(s => s.errors.length > 0)
                                .map(s => (
                                  <span key={s.subject_id} className="text-destructive block">
                                    {s.subject_name}: {s.errors.join(", ")}
                                  </span>
                                ))}
                              {row.isValid && (
                                <span className="text-muted-foreground">
                                  {row.subjects.filter(s => s.marks_1 || s.marks_2 || s.marks_3).length} subjects with marks
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={validRows.length === 0 || isDeploymentActive}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import {validRows.length} Students ({totalMarksToImport} marks)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Import</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You are about to import marks for <strong>{validRows.length}</strong> students
                  across <strong>{subjects.length}</strong> subjects.
                </p>
                <p>
                  Total marks entries: <strong>{totalMarksToImport}</strong>
                </p>
                <p className="text-warning text-sm">
                  This will overwrite any existing marks for the same student-subject combinations.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Import
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkMarksExcelImport;

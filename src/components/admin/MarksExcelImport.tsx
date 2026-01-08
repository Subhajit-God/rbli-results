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

interface ParsedMark {
  rowNumber: number;
  student_id: string;
  roll_number: number;
  student_name: string;
  subject_name: string;
  full_marks_1?: number;
  full_marks_2?: number;
  full_marks_3?: number;
  marks_1?: string;
  marks_2?: string;
  marks_3?: string;
  internal_student_id?: string;
  errors: string[];
  isValid: boolean;
}

interface MarksExcelImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
  examId: string;
  examName: string;
  classNumber: number;
  subjectId: string;
  subjectName: string;
  fullMarks1: number;
  fullMarks2: number;
  fullMarks3: number;
  initialMarkField: 'marks_1' | 'marks_2' | 'marks_3';
  isDeploymentActive: boolean;
}

type MarkFieldOption = 'marks_1' | 'marks_2' | 'marks_3' | 'all';

const MarksExcelImport = ({
  open,
  onOpenChange,
  onImportSuccess,
  examId,
  examName,
  classNumber,
  subjectId,
  subjectName,
  fullMarks1,
  fullMarks2,
  fullMarks3,
  initialMarkField,
  isDeploymentActive,
}: MarksExcelImportProps) => {
  const [selectedMarkField, setSelectedMarkField] = useState<MarkFieldOption>(initialMarkField);
  const [parsedMarks, setParsedMarks] = useState<ParsedMark[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const validMarks = parsedMarks.filter((m) => m.isValid);
  const invalidMarks = parsedMarks.filter((m) => !m.isValid);

  const getFieldLabel = (field: MarkFieldOption) => {
    if (field === 'marks_1') return 'Summative I';
    if (field === 'marks_2') return 'Summative II';
    if (field === 'marks_3') return 'Summative III';
    return 'All Summatives';
  };

  const getExpectedColumns = () => {
    if (selectedMarkField === 'all') {
      return [
        "STUDENT ID",
        "ROLL",
        "STUDENT NAME",
        "SUBJECT NAME",
        "FULL MARKS I",
        "MARKS I",
        "FULL MARKS II",
        "MARKS II",
        "FULL MARKS III",
        "MARKS III",
      ];
    }
    return [
      "STUDENT ID",
      "ROLL",
      "STUDENT NAME",
      "SUBJECT NAME",
      "FULL MARKS",
      "MARKS OBTAINED",
    ];
  };

  const getFullMarksForField = (field: 'marks_1' | 'marks_2' | 'marks_3') => {
    if (field === 'marks_1') return fullMarks1;
    if (field === 'marks_2') return fullMarks2;
    return fullMarks3;
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

    let templateData: (string | number)[][];
    let columnWidths: { wch: number }[];

    if (selectedMarkField === 'all') {
      // All summatives template
      templateData = [
        getExpectedColumns(),
        ...students.map((s) => [
          s.student_id,
          s.roll_number,
          s.name,
          subjectName,
          fullMarks1,
          "", // MARKS I
          fullMarks2,
          "", // MARKS II
          fullMarks3,
          "", // MARKS III
        ]),
      ];
      columnWidths = [
        { wch: 15 }, // STUDENT ID
        { wch: 8 },  // ROLL
        { wch: 25 }, // STUDENT NAME
        { wch: 25 }, // SUBJECT NAME
        { wch: 12 }, // FULL MARKS I
        { wch: 10 }, // MARKS I
        { wch: 12 }, // FULL MARKS II
        { wch: 10 }, // MARKS II
        { wch: 12 }, // FULL MARKS III
        { wch: 10 }, // MARKS III
      ];
    } else {
      // Single summative template
      const fullMarks = getFullMarksForField(selectedMarkField);
      templateData = [
        getExpectedColumns(),
        ...students.map((s) => [
          s.student_id,
          s.roll_number,
          s.name,
          subjectName,
          fullMarks,
          "", // MARKS OBTAINED
        ]),
      ];
      columnWidths = [
        { wch: 15 }, // STUDENT ID
        { wch: 8 },  // ROLL
        { wch: 25 }, // STUDENT NAME
        { wch: 25 }, // SUBJECT NAME
        { wch: 12 }, // FULL MARKS
        { wch: 15 }, // MARKS OBTAINED
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws["!cols"] = columnWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");
    
    const academicYear = examName.includes("(") 
      ? examName.split("(")[1]?.replace(")", "").trim() 
      : "2024-25";
    const fieldLabel = selectedMarkField === 'all' ? 'All' : getFieldLabel(selectedMarkField).replace(' ', '');
    const fileName = `Marks_${academicYear}_Class${classNumber}_${subjectName}_${fieldLabel}.xlsx`;
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
      return { valid: true }; // Valid special values - AB = Absent, EX = Exempt
    }
    
    const numMarks = parseFloat(trimmed);
    if (isNaN(numMarks)) {
      return { valid: false, error: "Marks must be a number, AB (Absent), or EX (Exempt)" };
    }
    if (numMarks < 0) {
      return { valid: false, error: "Marks cannot be negative" };
    }
    if (numMarks > fullMarks) {
      return { valid: false, error: `Marks (${numMarks}) exceeds full marks (${fullMarks})` };
    }
    
    return { valid: true };
  };

  const validateRowSingle = async (
    row: any,
    rowNumber: number,
    studentsMap: Map<string, { id: string; roll: number; name: string }>
  ): Promise<ParsedMark> => {
    const errors: string[] = [];

    const student_id = String(row["STUDENT ID"] || "").trim();
    const roll_number = parseInt(String(row["ROLL"] || "0"));
    const student_name = String(row["STUDENT NAME"] || "").trim();
    const subject_name = String(row["SUBJECT NAME"] || "").trim();
    const full_marks = parseFloat(String(row["FULL MARKS"] || "0"));
    const marks_obtained = String(row["MARKS OBTAINED"] || "").trim().toUpperCase();

    // Validate student exists
    const student = studentsMap.get(student_id);
    if (!student) {
      errors.push("Student ID not found in system");
    }

    // Validate subject matches
    if (subject_name.toLowerCase() !== subjectName.toLowerCase()) {
      errors.push(`Subject mismatch: expected "${subjectName}"`);
    }

    // Validate full marks matches
    const expectedFullMarks = getFullMarksForField(selectedMarkField as 'marks_1' | 'marks_2' | 'marks_3');
    if (full_marks !== expectedFullMarks) {
      errors.push(`Full marks mismatch: expected ${expectedFullMarks}`);
    }

    // Validate marks obtained
    const marksValidation = validateMarksValue(marks_obtained, full_marks);
    if (!marksValidation.valid && marksValidation.error) {
      errors.push(marksValidation.error);
    }

    const hasMarks = marks_obtained !== "";

    return {
      rowNumber,
      student_id,
      roll_number,
      student_name,
      subject_name,
      marks_1: selectedMarkField === 'marks_1' ? marks_obtained : undefined,
      marks_2: selectedMarkField === 'marks_2' ? marks_obtained : undefined,
      marks_3: selectedMarkField === 'marks_3' ? marks_obtained : undefined,
      internal_student_id: student?.id,
      errors,
      isValid: errors.length === 0 && hasMarks,
    };
  };

  const validateRowAll = async (
    row: any,
    rowNumber: number,
    studentsMap: Map<string, { id: string; roll: number; name: string }>
  ): Promise<ParsedMark> => {
    const errors: string[] = [];

    const student_id = String(row["STUDENT ID"] || "").trim();
    const roll_number = parseInt(String(row["ROLL"] || "0"));
    const student_name = String(row["STUDENT NAME"] || "").trim();
    const subject_name = String(row["SUBJECT NAME"] || "").trim();
    
    const full_marks_1 = parseFloat(String(row["FULL MARKS I"] || "0"));
    const full_marks_2 = parseFloat(String(row["FULL MARKS II"] || "0"));
    const full_marks_3 = parseFloat(String(row["FULL MARKS III"] || "0"));
    
    const marks_1 = String(row["MARKS I"] || "").trim().toUpperCase();
    const marks_2 = String(row["MARKS II"] || "").trim().toUpperCase();
    const marks_3 = String(row["MARKS III"] || "").trim().toUpperCase();

    // Validate student exists
    const student = studentsMap.get(student_id);
    if (!student) {
      errors.push("Student ID not found in system");
    }

    // Validate subject matches
    if (subject_name.toLowerCase() !== subjectName.toLowerCase()) {
      errors.push(`Subject mismatch: expected "${subjectName}"`);
    }

    // Validate full marks match
    if (full_marks_1 !== fullMarks1) {
      errors.push(`Full marks I mismatch: expected ${fullMarks1}`);
    }
    if (full_marks_2 !== fullMarks2) {
      errors.push(`Full marks II mismatch: expected ${fullMarks2}`);
    }
    if (full_marks_3 !== fullMarks3) {
      errors.push(`Full marks III mismatch: expected ${fullMarks3}`);
    }

    // Validate each marks field
    const m1Validation = validateMarksValue(marks_1, full_marks_1);
    if (!m1Validation.valid && m1Validation.error) {
      errors.push(`Marks I: ${m1Validation.error}`);
    }
    
    const m2Validation = validateMarksValue(marks_2, full_marks_2);
    if (!m2Validation.valid && m2Validation.error) {
      errors.push(`Marks II: ${m2Validation.error}`);
    }
    
    const m3Validation = validateMarksValue(marks_3, full_marks_3);
    if (!m3Validation.valid && m3Validation.error) {
      errors.push(`Marks III: ${m3Validation.error}`);
    }

    // At least one marks field should have a value
    const hasAnyMarks = marks_1 !== "" || marks_2 !== "" || marks_3 !== "";

    return {
      rowNumber,
      student_id,
      roll_number,
      student_name,
      subject_name,
      full_marks_1,
      full_marks_2,
      full_marks_3,
      marks_1,
      marks_2,
      marks_3,
      internal_student_id: student?.id,
      errors,
      isValid: errors.length === 0 && hasAnyMarks,
    };
  };

  const validateColumns = (sheet: XLSX.WorkSheet): { valid: boolean; error: string | null } => {
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    const headerRow: string[] = [];

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      headerRow.push(cell ? String(cell.v).trim().toUpperCase() : "");
    }

    const expectedColumns = getExpectedColumns();
    const missingColumns = expectedColumns.filter(
      (expected) => !headerRow.some((h) => h === expected)
    );

    if (missingColumns.length > 0) {
      return {
        valid: false,
        error: `Missing columns: ${missingColumns.join(", ")}. Please use the downloaded template for "${getFieldLabel(selectedMarkField)}".`,
      };
    }

    return { valid: true, error: null };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setIsProcessing(true);
    setParsedMarks([]);

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

      // Validate columns
      const columnValidation = validateColumns(sheet);
      if (!columnValidation.valid) {
        setFileError(columnValidation.error);
        setIsProcessing(false);
        return;
      }

      // Parse rows
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        setFileError("The Excel file is empty. Please add marks data.");
        setIsProcessing(false);
        return;
      }

      // Validate each row based on selected mode
      const parsed = await Promise.all(
        jsonData.map((row, index) => 
          selectedMarkField === 'all' 
            ? validateRowAll(row, index + 2, studentsMap)
            : validateRowSingle(row, index + 2, studentsMap)
        )
      );

      setParsedMarks(parsed);
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
    if (validMarks.length === 0) return;

    setIsImporting(true);
    try {
      // Prepare upsert data
      const marksToUpsert = validMarks.map((m) => {
        const baseData = {
          student_id: m.internal_student_id!,
          subject_id: subjectId,
          exam_id: examId,
        };

        if (selectedMarkField === 'all') {
          // For "all" mode, include all marks fields that have values
          const data: any = { ...baseData };
          if (m.marks_1 !== "" && m.marks_1 !== undefined) data.marks_1 = m.marks_1;
          if (m.marks_2 !== "" && m.marks_2 !== undefined) data.marks_2 = m.marks_2;
          if (m.marks_3 !== "" && m.marks_3 !== undefined) data.marks_3 = m.marks_3;
          return data;
        } else {
          // For single field mode
          const marksValue = selectedMarkField === 'marks_1' ? m.marks_1 
                           : selectedMarkField === 'marks_2' ? m.marks_2 
                           : m.marks_3;
          return {
            ...baseData,
            [selectedMarkField]: marksValue,
          };
        }
      });

      // Upsert marks
      const { error } = await supabase.from("marks").upsert(marksToUpsert, {
        onConflict: "student_id,subject_id,exam_id",
      });

      if (error) throw error;

      // Log activity
      await supabase.from("activity_logs").insert({
        action: "MARKS_EXCEL_IMPORT",
        details: {
          exam_id: examId,
          subject: subjectName,
          class: classNumber,
          field: selectedMarkField,
          imported_count: validMarks.length,
          skipped_count: invalidMarks.length,
        },
      });

      toast({
        title: "Import Successful",
        description: `${validMarks.length} mark(s) imported successfully`,
      });

      setShowConfirmDialog(false);
      setParsedMarks([]);
      onImportSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "Failed to import marks. Please try again.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setParsedMarks([]);
    setFileError(null);
    setShowConfirmDialog(false);
  };

  const handleMarkFieldChange = (value: MarkFieldOption) => {
    setSelectedMarkField(value);
    setParsedMarks([]);
    setFileError(null);
  };

  const getDisplayMarks = (mark: ParsedMark) => {
    if (selectedMarkField === 'all') {
      const parts = [];
      if (mark.marks_1) parts.push(`I: ${mark.marks_1}`);
      if (mark.marks_2) parts.push(`II: ${mark.marks_2}`);
      if (mark.marks_3) parts.push(`III: ${mark.marks_3}`);
      return parts.length > 0 ? parts.join(' | ') : '—';
    }
    const value = selectedMarkField === 'marks_1' ? mark.marks_1 
                : selectedMarkField === 'marks_2' ? mark.marks_2 
                : mark.marks_3;
    return value || '—';
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          if (!newOpen) resetState();
          onOpenChange(newOpen);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Marks via Excel
            </DialogTitle>
            <DialogDescription>
              {subjectName} - Class {classNumber}
            </DialogDescription>
          </DialogHeader>

          {isDeploymentActive && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Excel import is disabled after result deployment.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Mark Field Selector */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="mark-field-select" className="text-sm font-medium">
                      Select Summative Evaluation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Choose which summative marks to import
                    </p>
                  </div>
                  <Select
                    value={selectedMarkField}
                    onValueChange={(value) => handleMarkFieldChange(value as MarkFieldOption)}
                    disabled={isDeploymentActive}
                  >
                    <SelectTrigger className="w-[200px]" id="mark-field-select">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marks_1">Summative I ({fullMarks1})</SelectItem>
                      <SelectItem value="marks_2">Summative II ({fullMarks2})</SelectItem>
                      <SelectItem value="marks_3">Summative III ({fullMarks3})</SelectItem>
                      <SelectItem value="all">All Summatives</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Template Download */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-medium">Step 1: Download Template</h4>
                    <p className="text-sm text-muted-foreground">
                      Pre-filled with student list for {getFieldLabel(selectedMarkField)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use "AB" for Absent, "EX" for Exempt
                    </p>
                  </div>
                  <Button variant="outline" onClick={downloadTemplate} disabled={isDeploymentActive}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-medium">Step 2: Upload Filled Excel</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedMarkField === 'all' 
                        ? 'Fill "MARKS I", "MARKS II", "MARKS III" columns' 
                        : 'Fill "MARKS OBTAINED" column'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isDeploymentActive || isProcessing}
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isDeploymentActive || isProcessing}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isProcessing ? "Processing..." : "Upload Excel"}
                    </Button>
                  </div>
                </div>

                {fileError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{fileError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Preview Table */}
            {parsedMarks.length > 0 && (
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <CardDescription>
                    <span className="inline-flex items-center gap-4">
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {validMarks.length} Valid
                      </Badge>
                      {invalidMarks.length > 0 && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                          <X className="mr-1 h-3 w-3" />
                          {invalidMarks.length} Invalid
                        </Badge>
                      )}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Row</TableHead>
                          <TableHead>Roll</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="text-center">Marks</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedMarks.map((mark) => (
                          <TableRow
                            key={mark.rowNumber}
                            className={!mark.isValid ? "bg-destructive/5" : ""}
                          >
                            <TableCell className="text-muted-foreground">
                              {mark.rowNumber}
                            </TableCell>
                            <TableCell>{mark.roll_number}</TableCell>
                            <TableCell className="font-medium">
                              {mark.student_name}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {getDisplayMarks(mark)}
                            </TableCell>
                            <TableCell>
                              {mark.isValid ? (
                                <Badge variant="outline" className="bg-success/10 text-success">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Valid
                                </Badge>
                              ) : (mark.marks_1 === "" && mark.marks_2 === "" && mark.marks_3 === "") ||
                                  (selectedMarkField !== 'all' && 
                                   ((selectedMarkField === 'marks_1' && mark.marks_1 === "") ||
                                    (selectedMarkField === 'marks_2' && mark.marks_2 === "") ||
                                    (selectedMarkField === 'marks_3' && mark.marks_3 === ""))) ? (
                                <Badge variant="outline" className="bg-muted text-muted-foreground">
                                  Skipped
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-destructive/10 text-destructive">
                                  {mark.errors[0]}
                                </Badge>
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

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={validMarks.length === 0 || isDeploymentActive}
            >
              Import {validMarks.length} Mark(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Import</AlertDialogTitle>
            <AlertDialogDescription>
              This will import marks for {validMarks.length} student(s) in {subjectName}{" "}
              ({getFieldLabel(selectedMarkField)}). Existing marks will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Confirm Import"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MarksExcelImport;

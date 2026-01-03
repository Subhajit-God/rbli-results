import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parse, isValid } from "date-fns";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParsedStudent {
  rowNumber: number;
  student_id: string;
  name: string;
  class_number: number | null;
  section: string;
  roll_number: number | null;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  errors: string[];
  isValid: boolean;
}

interface ExistingStudent {
  student_id: string;
  class_number: number;
  section: string;
  roll_number: number;
}

const EXPECTED_COLUMNS = [
  "STUDENT ID",
  "FULL NAME",
  "CLASS",
  "SECTION",
  "ROLL",
  "FATHER NAME",
  "MOTHER NAME",
  "DATE OF BIRTH (DD-MM-YYYY)",
];

const ALLOWED_CLASSES = [5, 6, 7, 8, 9];

interface StudentExcelImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
  isDeploymentActive: boolean;
}

const StudentExcelImport = ({ 
  open, 
  onOpenChange, 
  onImportSuccess,
  isDeploymentActive 
}: StudentExcelImportProps) => {
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
  const [existingStudents, setExistingStudents] = useState<ExistingStudent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const validStudents = parsedStudents.filter(s => s.isValid);
  const invalidStudents = parsedStudents.filter(s => !s.isValid);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([EXPECTED_COLUMNS]);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // STUDENT ID
      { wch: 25 }, // FULL NAME
      { wch: 8 },  // CLASS
      { wch: 10 }, // SECTION
      { wch: 8 },  // ROLL
      { wch: 25 }, // FATHER NAME
      { wch: 25 }, // MOTHER NAME
      { wch: 25 }, // DATE OF BIRTH
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Import_Template.xlsx");
  };

  const fetchExistingStudents = async (): Promise<ExistingStudent[]> => {
    const { data } = await supabase
      .from('students')
      .select('student_id, class_number, section, roll_number');
    return data || [];
  };

  const parseDate = (value: any): { date: string | null; error: string | null } => {
    if (!value) return { date: null, error: "Date of birth is required" };
    
    // Handle Excel date serial number
    if (typeof value === 'number') {
      const excelDate = XLSX.SSF.parse_date_code(value);
      if (excelDate) {
        const dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
        return { date: dateStr, error: null };
      }
    }
    
    // Handle string date in DD-MM-YYYY format
    const strValue = String(value).trim();
    const parsed = parse(strValue, 'dd-MM-yyyy', new Date());
    
    if (isValid(parsed)) {
      return { date: format(parsed, 'yyyy-MM-dd'), error: null };
    }
    
    // Try other common formats
    const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'd-M-yyyy', 'd/M/yyyy'];
    for (const fmt of formats) {
      const attempt = parse(strValue, fmt, new Date());
      if (isValid(attempt)) {
        return { date: format(attempt, 'yyyy-MM-dd'), error: null };
      }
    }
    
    return { date: null, error: "Invalid date format. Use DD-MM-YYYY" };
  };

  const validateRow = (
    row: any,
    rowNumber: number,
    existing: ExistingStudent[],
    seenInFile: Map<string, number>,
    rollsInFile: Map<string, number>
  ): ParsedStudent => {
    const errors: string[] = [];
    
    // Extract values
    const student_id = String(row["STUDENT ID"] || "").trim();
    const name = String(row["FULL NAME"] || "").trim();
    const classValue = row["CLASS"];
    const section = String(row["SECTION"] || "").trim().toUpperCase();
    const rollValue = row["ROLL"];
    const father_name = String(row["FATHER NAME"] || "").trim();
    const mother_name = String(row["MOTHER NAME"] || "").trim();
    const dobRaw = row["DATE OF BIRTH (DD-MM-YYYY)"];

    // Validate required fields
    if (!student_id) errors.push("Student ID is required");
    if (!name) errors.push("Full Name is required");
    if (!section) errors.push("Section is required");

    // Validate class
    let class_number: number | null = null;
    if (classValue === undefined || classValue === null || classValue === "") {
      errors.push("Class is required");
    } else {
      class_number = parseInt(String(classValue));
      if (isNaN(class_number) || !ALLOWED_CLASSES.includes(class_number)) {
        errors.push("Class must be 5, 6, 7, 8, or 9");
        class_number = null;
      }
    }

    // Validate roll number
    let roll_number: number | null = null;
    if (rollValue === undefined || rollValue === null || rollValue === "") {
      errors.push("Roll number is required");
    } else {
      roll_number = parseInt(String(rollValue));
      if (isNaN(roll_number) || roll_number < 1) {
        errors.push("Roll number must be a positive number");
        roll_number = null;
      }
    }

    // Validate date of birth
    const { date: date_of_birth, error: dateError } = parseDate(dobRaw);
    if (dateError) errors.push(dateError);

    // Check for duplicate student ID in database
    if (student_id && existing.some(e => e.student_id === student_id)) {
      errors.push("This Student ID already exists in the system");
    }

    // Check for duplicate student ID in file
    if (student_id) {
      const prevRow = seenInFile.get(student_id);
      if (prevRow !== undefined) {
        errors.push(`Duplicate Student ID (same as row ${prevRow})`);
      } else {
        seenInFile.set(student_id, rowNumber);
      }
    }

    // Check for duplicate roll in same class+section
    if (class_number && roll_number && section) {
      const rollKey = `${class_number}-${section}-${roll_number}`;
      
      // Check database
      if (existing.some(e => 
        e.class_number === class_number && 
        e.section === section && 
        e.roll_number === roll_number
      )) {
        errors.push(`Roll ${roll_number} already exists in Class ${class_number} ${section}`);
      }
      
      // Check within file
      const prevRollRow = rollsInFile.get(rollKey);
      if (prevRollRow !== undefined) {
        errors.push(`Duplicate roll number in Class ${class_number} ${section} (same as row ${prevRollRow})`);
      } else {
        rollsInFile.set(rollKey, rowNumber);
      }
    }

    return {
      rowNumber,
      student_id,
      name,
      class_number,
      section,
      roll_number,
      father_name,
      mother_name,
      date_of_birth: date_of_birth || "",
      errors,
      isValid: errors.length === 0,
    };
  };

  const validateColumns = (sheet: XLSX.WorkSheet): { valid: boolean; error: string | null } => {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const headerRow: string[] = [];
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      headerRow.push(cell ? String(cell.v).trim().toUpperCase() : "");
    }

    const missingColumns = EXPECTED_COLUMNS.filter(
      expected => !headerRow.some(h => h === expected)
    );

    if (missingColumns.length > 0) {
      return {
        valid: false,
        error: `Missing columns: ${missingColumns.join(", ")}. Please use the provided template.`,
      };
    }

    return { valid: true, error: null };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setIsProcessing(true);
    setParsedStudents([]);

    try {
      // Fetch existing students
      const existing = await fetchExistingStudents();
      setExistingStudents(existing);

      // Read Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
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
        setFileError("The Excel file is empty. Please add student data.");
        setIsProcessing(false);
        return;
      }

      // Validate each row
      const seenInFile = new Map<string, number>();
      const rollsInFile = new Map<string, number>();
      
      const parsed = jsonData.map((row, index) => 
        validateRow(row, index + 2, existing, seenInFile, rollsInFile) // +2 for 1-indexed and header row
      );

      setParsedStudents(parsed);
    } catch (error) {
      console.error('Error parsing file:', error);
      setFileError("Could not read the Excel file. Please ensure it's a valid .xlsx file.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeStudent = (rowNumber: number) => {
    setParsedStudents(prev => prev.filter(s => s.rowNumber !== rowNumber));
  };

  const handleImport = async () => {
    if (validStudents.length === 0) return;

    setIsImporting(true);
    try {
      const studentsToInsert = validStudents.map(s => ({
        student_id: s.student_id,
        name: s.name,
        class_number: s.class_number!,
        section: s.section,
        roll_number: s.roll_number!,
        father_name: s.father_name || "",
        mother_name: s.mother_name || "",
        date_of_birth: s.date_of_birth,
      }));

      const { error } = await supabase
        .from('students')
        .insert(studentsToInsert);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        action: 'EXCEL_IMPORT',
        details: { 
          imported_count: validStudents.length,
          skipped_count: invalidStudents.length,
        },
      });

      toast({
        title: "Import Successful",
        description: `${validStudents.length} student(s) imported successfully`,
      });

      setShowConfirmDialog(false);
      setParsedStudents([]);
      onImportSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "Failed to import students. Please try again.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setParsedStudents([]);
    setFileError(null);
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) resetState();
        onOpenChange(newOpen);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Students via Excel
            </DialogTitle>
            <DialogDescription>
              Upload an Excel file to add multiple students at once
            </DialogDescription>
          </DialogHeader>

          {isDeploymentActive && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Excel import is disabled during result deployment. Please complete or rollback the deployment first.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Template Download */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-medium">Step 1: Download Template</h4>
                    <p className="text-sm text-muted-foreground">
                      Use our template to ensure correct formatting
                    </p>
                  </div>
                  <Button variant="outline" onClick={downloadTemplate}>
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
                      Upload your completed Excel file (.xlsx)
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
            {parsedStudents.length > 0 && (
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <CardDescription>
                    <span className="inline-flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-success" />
                        {validStudents.length} valid
                      </span>
                      {invalidStudents.length > 0 && (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          {invalidStudents.length} with errors
                        </span>
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
                          <TableHead className="w-12">Status</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Roll</TableHead>
                          <TableHead>DOB</TableHead>
                          <TableHead className="w-16">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedStudents.map((student) => (
                          <TableRow 
                            key={student.rowNumber}
                            className={!student.isValid ? "bg-destructive/5" : ""}
                          >
                            <TableCell className="font-medium">{student.rowNumber}</TableCell>
                            <TableCell>
                              {student.isValid ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <div className="group relative">
                                  <AlertCircle className="h-4 w-4 text-destructive cursor-help" />
                                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-2 bg-popover border rounded-md shadow-lg">
                                    <ul className="text-xs text-destructive space-y-1">
                                      {student.errors.map((err, i) => (
                                        <li key={i}>• {err}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{student.student_id || "-"}</TableCell>
                            <TableCell>{student.name || "-"}</TableCell>
                            <TableCell>{student.class_number || "-"}</TableCell>
                            <TableCell>{student.section || "-"}</TableCell>
                            <TableCell>{student.roll_number || "-"}</TableCell>
                            <TableCell>
                              {student.date_of_birth 
                                ? format(new Date(student.date_of_birth), "dd-MM-yyyy")
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeStudent(student.rowNumber)}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
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

          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {validStudents.length > 0 && (
              <Button 
                onClick={() => setShowConfirmDialog(true)}
                disabled={isDeploymentActive}
              >
                Import {validStudents.length} Student(s)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Import</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>You are about to import students from the uploaded Excel file.</p>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-2xl font-bold">{parsedStudents.length}</div>
                    <div className="text-sm text-muted-foreground">Total rows in Excel</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-success">{validStudents.length}</div>
                    <div className="text-sm text-muted-foreground">Valid students</div>
                  </div>
                  {invalidStudents.length > 0 && (
                    <div className="col-span-2">
                      <div className="text-lg font-bold text-destructive">{invalidStudents.length}</div>
                      <div className="text-sm text-muted-foreground">Rows will be skipped (errors)</div>
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} disabled={isImporting}>
              {isImporting ? "Importing..." : "Confirm & Import Students"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StudentExcelImport;

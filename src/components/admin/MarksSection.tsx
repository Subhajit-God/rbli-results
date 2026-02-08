import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Lock, Unlock, AlertTriangle, AlertCircle, FileSpreadsheet, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarksExcelImport from "./MarksExcelImport";
import BulkMarksExcelImport from "./BulkMarksExcelImport";
import { isAbsent, isExempt } from "@/components/AbsentBadge";

interface Exam {
  id: string;
  name: string;
  academic_year: string;
  is_deployed: boolean;
}

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
  class_number: number;
  roll_number: number;
}

interface Mark {
  id: string;
  student_id: string;
  subject_id: string;
  exam_id: string;
  marks_1: string | null;
  marks_2: string | null;
  marks_3: string | null;
  is_locked: boolean;
}

type MarkField = 'marks_1' | 'marks_2' | 'marks_3';

const MarksSection = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("5");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [activeMarkField, setActiveMarkField] = useState<MarkField>("marks_1");
  const [editedMarks, setEditedMarks] = useState<Record<string, { marks_1: string; marks_2: string; marks_3: string }>>({});
  const [markErrors, setMarkErrors] = useState<Record<string, { marks_1?: string; marks_2?: string; marks_3?: string }>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [isDeploymentActive, setIsDeploymentActive] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ studentId: string; field: MarkField } | null>(null);
  
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
    fetchSubjects();
    fetchStudents();
    checkDeploymentStatus();
  }, []);

  useEffect(() => {
    if (selectedExam && selectedSubject) {
      fetchMarks();
    }
  }, [selectedExam, selectedSubject]);

  const checkDeploymentStatus = async () => {
    const { data } = await supabase
      .from('exams')
      .select('is_deployed')
      .eq('is_deployed', true)
      .limit(1);
    setIsDeploymentActive((data?.length || 0) > 0);
  };

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('is_deployed', false)
      .order('created_at', { ascending: false });
    
    if (!error && data) setExams(data);
  };

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('class_number')
      .order('name');
    
    if (!error && data) setSubjects(data);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('class_number')
      .order('roll_number');
    
    if (!error && data) setStudents(data);
    setIsLoading(false);
  };

  const fetchMarks = async () => {
    const { data, error } = await supabase
      .from('marks')
      .select('*')
      .eq('exam_id', selectedExam)
      .eq('subject_id', selectedSubject);
    
    if (!error && data) {
      const marksMap: Record<string, Mark> = {};
      data.forEach(mark => {
        marksMap[mark.student_id] = mark;
      });
      setMarks(marksMap);
      setIsLocked(data.length > 0 && data.every(m => m.is_locked));
      
      // Initialize edited marks
      const edited: Record<string, { marks_1: string; marks_2: string; marks_3: string }> = {};
      data.forEach(mark => {
        edited[mark.student_id] = {
          marks_1: mark.marks_1 || '',
          marks_2: mark.marks_2 || '',
          marks_3: mark.marks_3 || '',
        };
      });
      setEditedMarks(edited);
    }
  };

  const filteredSubjects = subjects.filter(s => s.class_number.toString() === selectedClass);
  const filteredStudents = students.filter(s => s.class_number.toString() === selectedClass);
  const currentSubject = subjects.find(s => s.id === selectedSubject);
  const currentExam = exams.find(e => e.id === selectedExam);

  // Check if full marks are configured
  const isFullMarksConfigured = currentSubject && 
    currentSubject.full_marks_1 > 0 && 
    currentSubject.full_marks_2 > 0 && 
    currentSubject.full_marks_3 > 0;

  const getFullMarksForField = (field: MarkField): number => {
    if (!currentSubject) return 0;
    if (field === 'marks_1') return currentSubject.full_marks_1;
    if (field === 'marks_2') return currentSubject.full_marks_2;
    return currentSubject.full_marks_3;
  };

  const getFieldLabel = (field: MarkField): string => {
    if (field === 'marks_1') return 'Summative I';
    if (field === 'marks_2') return 'Summative II';
    return 'Summative III';
  };

  // Auto-save when moving away from a cell
  const autoSaveMarks = useCallback(async () => {
    if (!selectedExam || !selectedSubject || isLocked) return;
    
    // Don't save if there are validation errors
    if (hasValidationErrors()) return;

    try {
      const upserts = filteredStudents
        .filter(student => editedMarks[student.id])
        .map(student => ({
          student_id: student.id,
          subject_id: selectedSubject,
          exam_id: selectedExam,
          marks_1: editedMarks[student.id]?.marks_1 || null,
          marks_2: editedMarks[student.id]?.marks_2 || null,
          marks_3: editedMarks[student.id]?.marks_3 || null,
          is_locked: isLocked,
        }));

      if (upserts.length > 0) {
        await supabase
          .from('marks')
          .upsert(upserts, { onConflict: 'student_id,subject_id,exam_id' });
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [selectedExam, selectedSubject, filteredStudents, editedMarks, isLocked]);

  const handleMarkChange = (studentId: string, field: MarkField, value: string) => {
    // Validate: only numbers, AB, or EX
    const upperValue = value.toUpperCase();
    if (value && !['AB', 'EX'].includes(upperValue) && isNaN(parseFloat(value))) {
      return;
    }

    // Clear error when value changes
    setMarkErrors(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: undefined,
      },
    }));

    // Validate against full marks
    const fullMarks = getFullMarksForField(field);
    if (value && !['AB', 'EX'].includes(upperValue)) {
      const numValue = parseFloat(value);
      if (numValue < 0) {
        setMarkErrors(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [field]: "Marks cannot be negative.",
          },
        }));
      } else if (numValue > fullMarks) {
        setMarkErrors(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [field]: `Exceeds full marks (${fullMarks})`,
          },
        }));
      }
    }

    setEditedMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId] || { marks_1: '', marks_2: '', marks_3: '' },
        [field]: value,
      },
    }));
  };

  const hasValidationErrors = (): boolean => {
    return Object.values(markErrors).some(errors => 
      errors.marks_1 || errors.marks_2 || errors.marks_3
    );
  };

  // Keyboard navigation handler
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentId: string,
    field: MarkField,
    studentIndex: number
  ) => {
    const studentIds = filteredStudents.map(s => s.id);
    const fields: MarkField[] = ['marks_1', 'marks_2', 'marks_3'];
    const fieldIndex = fields.indexOf(field);

    let nextStudentId: string | null = null;
    let nextField: MarkField | null = null;

    switch (e.key) {
      case 'Enter':
      case 'ArrowDown':
        e.preventDefault();
        // Move to same field, next student
        if (studentIndex < studentIds.length - 1) {
          nextStudentId = studentIds[studentIndex + 1];
          nextField = field;
        }
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        // Move to same field, previous student
        if (studentIndex > 0) {
          nextStudentId = studentIds[studentIndex - 1];
          nextField = field;
        }
        break;
      
      case 'ArrowRight':
        e.preventDefault();
        // Move to next field, same student
        if (fieldIndex < fields.length - 1) {
          nextStudentId = studentId;
          nextField = fields[fieldIndex + 1];
        }
        break;
      
      case 'ArrowLeft':
        e.preventDefault();
        // Move to previous field, same student
        if (fieldIndex > 0) {
          nextStudentId = studentId;
          nextField = fields[fieldIndex - 1];
        }
        break;
      
      case 'Tab':
        // Let default tab behavior work, but trigger auto-save
        autoSaveMarks();
        return;
      
      default:
        return;
    }

    if (nextStudentId && nextField) {
      autoSaveMarks();
      const refKey = `${nextStudentId}-${nextField}`;
      const nextInput = inputRefs.current.get(refKey);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
        setFocusedCell({ studentId: nextStudentId, field: nextField });
      }
    }
  };

  const handleFocus = (studentId: string, field: MarkField) => {
    setFocusedCell({ studentId, field });
    // Select all text when focusing
    const refKey = `${studentId}-${field}`;
    const input = inputRefs.current.get(refKey);
    if (input) {
      input.select();
    }
  };

  const handleBlur = () => {
    autoSaveMarks();
  };

  const setInputRef = (studentId: string, field: MarkField, el: HTMLInputElement | null) => {
    const refKey = `${studentId}-${field}`;
    if (el) {
      inputRefs.current.set(refKey, el);
    } else {
      inputRefs.current.delete(refKey);
    }
  };

  const handleSave = async () => {
    if (!selectedExam || !selectedSubject) return;

    setIsSaving(true);
    try {
      const upserts = filteredStudents.map(student => ({
        student_id: student.id,
        subject_id: selectedSubject,
        exam_id: selectedExam,
        marks_1: editedMarks[student.id]?.marks_1 || null,
        marks_2: editedMarks[student.id]?.marks_2 || null,
        marks_3: editedMarks[student.id]?.marks_3 || null,
        is_locked: isLocked,
      }));

      const { error } = await supabase
        .from('marks')
        .upsert(upserts, { onConflict: 'student_id,subject_id,exam_id' });

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        action: 'MARKS_SAVED',
        details: {
          exam_id: selectedExam,
          subject_id: selectedSubject,
          class: selectedClass,
          count: upserts.length,
        },
      });
      
      toast({ title: "Saved", description: "Marks saved successfully" });
      fetchMarks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save marks",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleLock = async () => {
    if (!selectedExam || !selectedSubject) return;

    try {
      const { error } = await supabase
        .from('marks')
        .update({ is_locked: !isLocked })
        .eq('exam_id', selectedExam)
        .eq('subject_id', selectedSubject);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        action: isLocked ? 'MARKS_UNLOCKED' : 'MARKS_LOCKED',
        details: {
          exam_id: selectedExam,
          subject_id: selectedSubject,
          class: selectedClass,
        },
      });
      
      setIsLocked(!isLocked);
      toast({ 
        title: isLocked ? "Unlocked" : "Locked", 
        description: `Marks ${isLocked ? 'unlocked' : 'locked'} successfully` 
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to toggle lock",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Marks Entry</h2>
        <p className="text-muted-foreground">Enter marks for students subject-wise (Summative Evaluation)</p>
      </div>

      {/* Keyboard Shortcuts Help */}
      <Alert className="bg-muted/50 border-muted">
        <AlertDescription className="text-sm">
          <strong>Keyboard Shortcuts:</strong> Use <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">↓</kbd> to move down, <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">↑</kbd> to move up, <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">→</kbd> / <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">←</kbd> to switch columns. Data auto-saves when you move.
        </AlertDescription>
      </Alert>

      {/* Selection Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Examination *</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.length === 0 ? (
                    <SelectItem value="none" disabled>No exams available</SelectItem>
                  ) : (
                    exams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name} ({exam.academic_year})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Class *</Label>
              <Select value={selectedClass} onValueChange={(v) => {
                setSelectedClass(v);
                setSelectedSubject("");
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Class 5</SelectItem>
                  <SelectItem value="6">Class 6</SelectItem>
                  <SelectItem value="7">Class 7</SelectItem>
                  <SelectItem value="8">Class 8</SelectItem>
                  <SelectItem value="9">Class 9</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subject *</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubjects.length === 0 ? (
                    <SelectItem value="none" disabled>No subjects for this class</SelectItem>
                  ) : (
                    filteredSubjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2 flex-wrap">
              <Button 
                onClick={handleSave} 
                disabled={!selectedExam || !selectedSubject || isLocked || isSaving || hasValidationErrors() || !isFullMarksConfigured}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              {Object.keys(marks).length > 0 && (
                <Button variant="outline" onClick={handleToggleLock}>
                  {isLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                  {isLocked ? "Unlock" : "Lock"}
                </Button>
              )}
              {selectedExam && selectedSubject && currentSubject && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowExcelImport(true)}
                  disabled={isLocked || isDeploymentActive}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              )}
              {selectedExam && filteredSubjects.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowBulkImport(true)}
                  disabled={isDeploymentActive}
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Bulk Import (All Subjects)
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Marks Warning */}
      {selectedSubject && !isFullMarksConfigured && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Full marks not configured!</strong> Please set full marks for this subject before entering marks. Go to Subjects → Edit this subject to configure full marks.
          </AlertDescription>
        </Alert>
      )}

      {/* Marks Entry Table */}
      {selectedExam && selectedSubject && currentSubject ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <CardTitle>{currentSubject.name} - Class {selectedClass}</CardTitle>
                <CardDescription>
                  Enter marks for Summative I, II, III. Use AB for Absent, EX for Exempt.
                </CardDescription>
              </div>
              {isLocked && (
                <Badge variant="secondary" className="bg-warning/20 text-warning">
                  <Lock className="mr-1 h-3 w-3" /> Locked
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isFullMarksConfigured ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please set full marks before entering marks.
                </AlertDescription>
              </Alert>
            ) : filteredStudents.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No students found for Class {selectedClass}. Add students first.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Roll</TableHead>
                      <TableHead className="min-w-[150px]">Student Name</TableHead>
                      <TableHead className="text-center w-28">I (FM: {currentSubject.full_marks_1})</TableHead>
                      <TableHead className="text-center w-28">II (FM: {currentSubject.full_marks_2})</TableHead>
                      <TableHead className="text-center w-28">III (FM: {currentSubject.full_marks_3})</TableHead>
                      <TableHead className="text-center w-24">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student, index) => {
                      const studentMarks = editedMarks[student.id] || { marks_1: '', marks_2: '', marks_3: '' };
                      const m1 = ['AB', 'EX'].includes(studentMarks.marks_1.toUpperCase()) ? 0 : parseFloat(studentMarks.marks_1) || 0;
                      const m2 = ['AB', 'EX'].includes(studentMarks.marks_2.toUpperCase()) ? 0 : parseFloat(studentMarks.marks_2) || 0;
                      const m3 = ['AB', 'EX'].includes(studentMarks.marks_3.toUpperCase()) ? 0 : parseFloat(studentMarks.marks_3) || 0;
                      const total = m1 + m2 + m3;

                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.roll_number}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          {(['marks_1', 'marks_2', 'marks_3'] as MarkField[]).map((field) => {
                            const isFocused = focusedCell?.studentId === student.id && focusedCell?.field === field;
                            return (
                              <TableCell key={field}>
                                <div className="flex flex-col items-center">
                                  <Input
                                    ref={(el) => setInputRef(student.id, field, el)}
                                    className={`w-20 text-center mx-auto transition-all ${
                                      markErrors[student.id]?.[field] 
                                        ? 'border-destructive ring-1 ring-destructive' 
                                        : isAbsent(studentMarks[field])
                                          ? 'border-destructive/50 bg-destructive/10'
                                          : isExempt(studentMarks[field])
                                            ? 'border-muted bg-muted/30'
                                            : isFocused 
                                              ? 'border-primary ring-2 ring-primary/30' 
                                              : ''
                                    }`}
                                    value={studentMarks[field]}
                                    onChange={(e) => handleMarkChange(student.id, field, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, student.id, field, index)}
                                    onFocus={() => handleFocus(student.id, field)}
                                    onBlur={handleBlur}
                                    placeholder="—"
                                    disabled={isLocked || !isFullMarksConfigured}
                                  />
                                  {markErrors[student.id]?.[field] && (
                                    <span className="text-xs text-destructive mt-1">{markErrors[student.id][field]}</span>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-semibold">
                            {total} / {currentSubject.full_marks_1 + currentSubject.full_marks_2 + currentSubject.full_marks_3}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {exams.length === 0 ? (
              <div className="space-y-2">
                <AlertTriangle className="h-8 w-8 mx-auto text-warning" />
                <p>No examination found. Create an examination first to enter marks.</p>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="space-y-2">
                <AlertTriangle className="h-8 w-8 mx-auto text-warning" />
                <p>No subjects configured for this class. Add subjects first.</p>
              </div>
            ) : (
              "Select an examination, class, and subject to enter marks."
            )}
          </CardContent>
        </Card>
      )}

      {/* Excel Import Dialog (Single Subject) */}
      {selectedExam && selectedSubject && currentSubject && currentExam && (
        <MarksExcelImport
          open={showExcelImport}
          onOpenChange={setShowExcelImport}
          onImportSuccess={() => fetchMarks()}
          examId={selectedExam}
          examName={`${currentExam.name} (${currentExam.academic_year})`}
          classNumber={parseInt(selectedClass)}
          subjectId={selectedSubject}
          subjectName={currentSubject.name}
          fullMarks1={currentSubject.full_marks_1}
          fullMarks2={currentSubject.full_marks_2}
          fullMarks3={currentSubject.full_marks_3}
          initialMarkField={activeMarkField}
          isDeploymentActive={isDeploymentActive}
        />
      )}

      {/* Bulk Marks Import Dialog (All Subjects) */}
      {selectedExam && currentExam && filteredSubjects.length > 0 && (
        <BulkMarksExcelImport
          open={showBulkImport}
          onOpenChange={setShowBulkImport}
          onImportSuccess={() => {
            fetchMarks();
            fetchSubjects();
          }}
          examId={selectedExam}
          exam={currentExam}
          classNumber={parseInt(selectedClass)}
          subjects={filteredSubjects}
          isDeploymentActive={isDeploymentActive}
        />
      )}
    </div>
  );
};

export default MarksSection;

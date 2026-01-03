import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Lock, Unlock, AlertTriangle } from "lucide-react";
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
  const [editedMarks, setEditedMarks] = useState<Record<string, { marks_1: string; marks_2: string; marks_3: string }>>({});
  const [markErrors, setMarkErrors] = useState<Record<string, { marks_1?: string; marks_2?: string; marks_3?: string }>>({});
  const [isLocked, setIsLocked] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
    fetchSubjects();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedExam && selectedSubject) {
      fetchMarks();
    }
  }, [selectedExam, selectedSubject]);

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

  const getFullMarksForField = (field: 'marks_1' | 'marks_2' | 'marks_3'): number => {
    if (!currentSubject) return 0;
    if (field === 'marks_1') return currentSubject.full_marks_1;
    if (field === 'marks_2') return currentSubject.full_marks_2;
    return currentSubject.full_marks_3;
  };

  const handleMarkChange = (studentId: string, field: 'marks_1' | 'marks_2' | 'marks_3', value: string) => {
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
            [field]: `Marks cannot exceed full marks (${fullMarks}).`,
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
        <p className="text-muted-foreground">Enter marks for students subject-wise</p>
      </div>

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
                  {exams.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name} ({exam.academic_year})
                    </SelectItem>
                  ))}
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
                  {filteredSubjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleSave} disabled={!selectedExam || !selectedSubject || isLocked || isSaving || hasValidationErrors()}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Marks"}
              </Button>
              {Object.keys(marks).length > 0 && (
                <Button variant="outline" onClick={handleToggleLock}>
                  {isLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                  {isLocked ? "Unlock" : "Lock"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marks Entry Table */}
      {selectedExam && selectedSubject && currentSubject ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{currentSubject.name} - Class {selectedClass}</CardTitle>
                <CardDescription>
                  Enter marks for each component. Use AB for Absent, EX for Exempt.
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
            {filteredStudents.length === 0 ? (
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
                      <TableHead>Roll</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-center">I (FM: {currentSubject.full_marks_1})</TableHead>
                      <TableHead className="text-center">II (FM: {currentSubject.full_marks_2})</TableHead>
                      <TableHead className="text-center">III (FM: {currentSubject.full_marks_3})</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(student => {
                      const studentMarks = editedMarks[student.id] || { marks_1: '', marks_2: '', marks_3: '' };
                      const m1 = ['AB', 'EX'].includes(studentMarks.marks_1.toUpperCase()) ? 0 : parseFloat(studentMarks.marks_1) || 0;
                      const m2 = ['AB', 'EX'].includes(studentMarks.marks_2.toUpperCase()) ? 0 : parseFloat(studentMarks.marks_2) || 0;
                      const m3 = ['AB', 'EX'].includes(studentMarks.marks_3.toUpperCase()) ? 0 : parseFloat(studentMarks.marks_3) || 0;
                      const total = m1 + m2 + m3;

                      return (
                        <TableRow key={student.id}>
                          <TableCell>{student.roll_number}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center">
                              <Input
                                className={`w-20 text-center mx-auto ${markErrors[student.id]?.marks_1 ? 'border-destructive' : ''}`}
                                value={studentMarks.marks_1}
                                onChange={(e) => handleMarkChange(student.id, 'marks_1', e.target.value)}
                                placeholder="—"
                                disabled={isLocked}
                                max={currentSubject.full_marks_1}
                                min={0}
                              />
                              {markErrors[student.id]?.marks_1 && (
                                <span className="text-xs text-destructive mt-1">{markErrors[student.id].marks_1}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center">
                              <Input
                                className={`w-20 text-center mx-auto ${markErrors[student.id]?.marks_2 ? 'border-destructive' : ''}`}
                                value={studentMarks.marks_2}
                                onChange={(e) => handleMarkChange(student.id, 'marks_2', e.target.value)}
                                placeholder="—"
                                disabled={isLocked}
                                max={currentSubject.full_marks_2}
                                min={0}
                              />
                              {markErrors[student.id]?.marks_2 && (
                                <span className="text-xs text-destructive mt-1">{markErrors[student.id].marks_2}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center">
                              <Input
                                className={`w-20 text-center mx-auto ${markErrors[student.id]?.marks_3 ? 'border-destructive' : ''}`}
                                value={studentMarks.marks_3}
                                onChange={(e) => handleMarkChange(student.id, 'marks_3', e.target.value)}
                                placeholder="—"
                                disabled={isLocked}
                                max={currentSubject.full_marks_3}
                                min={0}
                              />
                              {markErrors[student.id]?.marks_3 && (
                                <span className="text-xs text-destructive mt-1">{markErrors[student.id].marks_3}</span>
                              )}
                            </div>
                          </TableCell>
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
            Select an examination, class, and subject to enter marks.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarksSection;

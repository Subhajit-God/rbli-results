import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Calendar, Info, ArrowUpCircle, Download, Users, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import * as XLSX from "xlsx";

interface Exam {
  id: string;
  name: string;
  academic_year: string;
  is_deployed: boolean;
  is_current: boolean;
  deployed_at: string | null;
  created_at: string;
}

interface Student {
  id: string;
  student_id: string;
  name: string;
  class_number: number;
  section: string;
  roll_number: number;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  academic_year_id: string | null;
}

interface ExamsSectionProps {
  onDeploymentChange?: () => void;
}

const ExamsSection = ({ onDeploymentChange }: ExamsSectionProps) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionStats, setPromotionStats] = useState<{
    class5: number;
    class6: number;
    class7: number;
    class8: number;
    class9: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    academic_year: new Date().getFullYear().toString(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  // Fixed exam name - Summative Evaluation only
  const EXAM_NAME = "Summative Evaluation";

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setExams(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch exams",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentsForPromotion = async () => {
    // Get students from the deployed exam's academic year or all students without academic_year_id
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .order('class_number')
      .order('roll_number');
    
    if (error) {
      console.error('Error fetching students:', error);
      return null;
    }

    // Calculate stats per class
    const stats = {
      class5: students?.filter(s => s.class_number === 5).length || 0,
      class6: students?.filter(s => s.class_number === 6).length || 0,
      class7: students?.filter(s => s.class_number === 7).length || 0,
      class8: students?.filter(s => s.class_number === 8).length || 0,
      class9: students?.filter(s => s.class_number === 9).length || 0,
    };

    setPromotionStats(stats);
    return students;
  };

  const handleOpenDialog = (exam?: Exam) => {
    if (exam) {
      setSelectedExam(exam);
      setFormData({
        academic_year: exam.academic_year,
      });
    } else {
      setSelectedExam(null);
      setFormData({
        academic_year: (parseInt(new Date().getFullYear().toString()) + 1).toString(),
      });
    }
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleOpenPromotionDialog = async () => {
    await fetchStudentsForPromotion();
    setIsPromotionDialogOpen(true);
  };

  const assignSectionByRoll = (rollNumber: number): string => {
    // Odd roll numbers → Section A, Even roll numbers → Section B
    return rollNumber % 2 === 1 ? "A" : "B";
  };

  const handlePromoteStudents = async () => {
    setIsPromoting(true);
    
    try {
      // Fetch all current students
      const { data: students, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .order('class_number')
        .order('name');
      
      if (fetchError) throw fetchError;
      if (!students || students.length === 0) {
        toast({
          variant: "destructive",
          title: "No Students",
          description: "No students found to promote",
        });
        return;
      }

      // Separate Class 9 students (they will be exported, not promoted in DB)
      const class9Students = students.filter(s => s.class_number === 9);
      const otherStudents = students.filter(s => s.class_number < 9);

      // Generate Class 10 promotion data for Class 9 students
      if (class9Students.length > 0) {
        const class10Data = class9Students.map((student, index) => ({
          "Previous Student ID": student.student_id,
          "Name": student.name,
          "Promoted to Class": 10,
          "New Roll Number": index + 1,
          "New Section": assignSectionByRoll(index + 1),
          "Father's Name": student.father_name,
          "Mother's Name": student.mother_name,
          "Date of Birth": student.date_of_birth,
        }));

        // Create and download Excel file
        const worksheet = XLSX.utils.json_to_sheet(class10Data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Class 10 Promotions");
        
        // Auto-size columns
        const colWidths = [
          { wch: 20 }, // Previous Student ID
          { wch: 25 }, // Name
          { wch: 15 }, // Promoted to Class
          { wch: 15 }, // New Roll Number
          { wch: 12 }, // New Section
          { wch: 25 }, // Father's Name
          { wch: 25 }, // Mother's Name
          { wch: 15 }, // Date of Birth
        ];
        worksheet['!cols'] = colWidths;

        XLSX.writeFile(workbook, `Class_10_Promotions_${formData.academic_year}.xlsx`);
        
        toast({
          title: "Class 10 Data Exported",
          description: `${class9Students.length} students' promotion data has been downloaded`,
        });
      }

      // Delete all existing students (we'll recreate promoted ones)
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) throw deleteError;

      // Create the new academic year first
      const { data: newExam, error: examError } = await supabase
        .from('exams')
        .insert({
          name: EXAM_NAME,
          academic_year: formData.academic_year,
        })
        .select()
        .single();

      if (examError) throw examError;

      // Promote students (Class 5-8 → Class 6-9) with new roll numbers
      if (otherStudents.length > 0) {
        // Group by new class
        const promotedByClass: Record<number, typeof otherStudents> = {};
        
        otherStudents.forEach(student => {
          const newClass = student.class_number + 1;
          if (!promotedByClass[newClass]) {
            promotedByClass[newClass] = [];
          }
          promotedByClass[newClass].push(student);
        });

        // Create promoted students with new roll numbers and sections
        const promotedStudents: Omit<Student, 'id'>[] = [];
        
        Object.entries(promotedByClass).forEach(([classNum, classStudents]) => {
          // Sort by name for consistent roll number assignment
          classStudents.sort((a, b) => a.name.localeCompare(b.name));
          
          classStudents.forEach((student, index) => {
            const newRollNumber = index + 1;
            promotedStudents.push({
              student_id: student.student_id,
              name: student.name,
              class_number: parseInt(classNum),
              section: assignSectionByRoll(newRollNumber),
              roll_number: newRollNumber,
              father_name: student.father_name,
              mother_name: student.mother_name,
              date_of_birth: student.date_of_birth,
              academic_year_id: newExam.id,
            });
          });
        });

        // Insert all promoted students
        const { error: insertError } = await supabase
          .from('students')
          .insert(promotedStudents);

        if (insertError) throw insertError;

        toast({
          title: "Students Promoted",
          description: `${promotedStudents.length} students promoted to new classes`,
        });
      }

      // Close dialog and refresh
      setIsPromotionDialogOpen(false);
      setIsDialogOpen(false);
      fetchExams();
      onDeploymentChange?.();
      
      toast({
        title: "Academic Year Created",
        description: `New academic year ${formData.academic_year} created with promoted students`,
      });

    } catch (error: any) {
      console.error('Promotion error:', error);
      toast({
        variant: "destructive",
        title: "Promotion Failed",
        description: error.message || "Failed to promote students",
      });
    } finally {
      setIsPromoting(false);
    }
  };

  // Check if this is the first academic year (no existing exams)
  const isFirstAcademicYear = exams.length === 0;

  const handleCreateFirstAcademicYear = async () => {
    try {
      const { data: newExam, error } = await supabase
        .from('exams')
        .insert({
          name: EXAM_NAME,
          academic_year: formData.academic_year,
          is_current: true, // Set as current since it's the first one
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Academic Year Created",
        description: `Academic year ${formData.academic_year} created successfully. You can now add students.`,
      });

      setIsDialogOpen(false);
      fetchExams();
      onDeploymentChange?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create academic year",
      });
    }
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.academic_year) newErrors.academic_year = "Academic year is required";

    // Check for existing exam with same year (only for new exams)
    if (!selectedExam) {
      const existingExam = exams.find(e => e.academic_year === formData.academic_year);
      if (existingExam) {
        newErrors.academic_year = `An exam for ${formData.academic_year} already exists`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (selectedExam) {
        const { error } = await supabase
          .from('exams')
          .update({
            name: EXAM_NAME,
            academic_year: formData.academic_year,
          })
          .eq('id', selectedExam.id);

        if (error) throw error;
        toast({ title: "Success", description: "Academic year updated successfully" });
      } else {
        // Check if this is the first academic year
        if (isFirstAcademicYear) {
          // First time - just create without promotion
          await handleCreateFirstAcademicYear();
          return;
        }
        // For subsequent academic years, show promotion dialog
        await handleOpenPromotionDialog();
        return; // Don't close dialog yet
      }

      setIsDialogOpen(false);
      fetchExams();
      onDeploymentChange?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedExam) return;

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', selectedExam.id);

      if (error) throw error;
      
      toast({ title: "Deleted", description: "Academic year deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSelectedExam(null);
      fetchExams();
      onDeploymentChange?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete",
      });
    }
  };

  // Check if there's a deployed exam
  const hasDeployedExam = exams.some(e => e.is_deployed);
  
  // Get the current academic year
  const currentAcademicYear = exams.find(e => e.is_current);

  const handleSetCurrent = async (exam: Exam) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_current: true })
        .eq('id', exam.id);

      if (error) throw error;
      
      toast({
        title: "Current Year Set",
        description: `${exam.academic_year} is now the current academic year`,
      });
      fetchExams();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to set current academic year",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Academic Year</h2>
          <p className="text-muted-foreground">Create and manage academic year evaluations</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Create Academic Year
        </Button>
      </div>

      {hasDeployedExam && (
        <Alert className="border-warning/50 bg-warning/10">
          <ArrowUpCircle className="h-4 w-4 text-warning" />
          <AlertDescription>
            <strong>Results are deployed!</strong> Create a new academic year to promote students and 
            start fresh. Class 9 students will be exported to Excel for Class 10 promotion.
          </AlertDescription>
        </Alert>
      )}

      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          Each academic year has one Summative Evaluation containing three parts: 
          <strong> Summative I</strong>, <strong>Summative II</strong>, and <strong>Summative III</strong>.
          Marks for all three are entered subject-wise.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No academic years created yet. Click "Create Academic Year" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card 
              key={exam.id} 
              className={`${exam.is_current ? "border-primary border-2 ring-2 ring-primary/20" : ""} ${exam.is_deployed ? "border-success/50" : ""}`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {exam.name}
                      {exam.is_current && (
                        <Star className="h-4 w-4 text-primary fill-primary" />
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      Academic Year: {exam.academic_year}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {exam.is_current && (
                      <Badge variant="default" className="bg-primary">
                        Current
                      </Badge>
                    )}
                    <Badge variant={exam.is_deployed ? "default" : "secondary"}>
                      {exam.is_deployed ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {!exam.is_current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetCurrent(exam)}
                      className="border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Set Current
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(exam)}
                    disabled={exam.is_deployed}
                  >
                    <Edit className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedExam(exam);
                      setIsDeleteDialogOpen(true);
                    }}
                    disabled={exam.is_deployed}
                  >
                    <Trash2 className="mr-1 h-3 w-3 text-destructive" /> Delete
                  </Button>
                </div>
                {exam.is_deployed && exam.deployed_at && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Published on {format(new Date(exam.deployed_at), "dd MMM yyyy, hh:mm a")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedExam ? "Edit Academic Year" : "Create New Academic Year"}
            </DialogTitle>
            <DialogDescription>
              {selectedExam 
                ? "Update the academic year for this Summative Evaluation" 
                : "Create a new academic year and promote students from the previous year"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Examination Name</Label>
              <Input
                value={EXAM_NAME}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The examination name is fixed as "Summative Evaluation"
              </p>
            </div>

            <div>
              <Label htmlFor="year">Academic Year *</Label>
              <Input
                id="year"
                value={formData.academic_year}
                onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                placeholder="e.g., 2025"
                className={errors.academic_year ? "border-destructive" : ""}
              />
              {errors.academic_year && <p className="text-sm text-destructive mt-1">{errors.academic_year}</p>}
            </div>

            {!selectedExam && (
              <Alert className={isFirstAcademicYear ? "border-primary/30 bg-primary/5" : "border-muted"}>
                <Users className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {isFirstAcademicYear ? (
                    <>
                      <strong>First Academic Year Setup</strong>
                      <p className="mt-1">
                        This is your first academic year. No student promotion will occur. 
                        After creating this, you can add students manually or import them via Excel.
                      </p>
                    </>
                  ) : (
                    <>
                      Creating a new academic year will:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Promote Class 5-8 students to Classes 6-9</li>
                        <li>Assign new roll numbers (alphabetically)</li>
                        <li>Set sections: Odd rolls → A, Even rolls → B</li>
                        <li>Export Class 9 students as Class 10 Excel file</li>
                      </ul>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {selectedExam ? "Update" : (isFirstAcademicYear ? "Create Academic Year" : "Continue to Promotion")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promotion Confirmation Dialog */}
      <AlertDialog open={isPromotionDialogOpen} onOpenChange={setIsPromotionDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
              Confirm Student Promotion
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to create Academic Year <strong>{formData.academic_year}</strong> and 
                  promote all students.
                </p>
                
                {promotionStats && (
                  <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                    <p className="font-medium">Current students:</p>
                    <ul className="space-y-1">
                      <li>Class 5 → Class 6: <strong>{promotionStats.class5}</strong> students</li>
                      <li>Class 6 → Class 7: <strong>{promotionStats.class6}</strong> students</li>
                      <li>Class 7 → Class 8: <strong>{promotionStats.class7}</strong> students</li>
                      <li>Class 8 → Class 9: <strong>{promotionStats.class8}</strong> students</li>
                      <li className="text-warning-foreground">
                        Class 9 → Excel Export: <strong>{promotionStats.class9}</strong> students
                      </li>
                    </ul>
                  </div>
                )}

                <Alert variant="destructive" className="text-sm">
                  <AlertDescription>
                    <strong>Warning:</strong> This action will delete all current student records 
                    and create new promoted records. Class 9 students will only be saved in the 
                    downloaded Excel file.
                  </AlertDescription>
                </Alert>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPromoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePromoteStudents} 
              disabled={isPromoting}
              className="bg-primary"
            >
              {isPromoting ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Promoting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Promote & Create
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Academic Year</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the Summative Evaluation for {selectedExam?.academic_year}? 
              This will also delete all associated marks and ranks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExamsSection;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import InitializeSubjectsButton from "./InitializeSubjectsButton";

interface Subject {
  id: string;
  name: string;
  class_number: number;
  full_marks_1: number;
  full_marks_2: number;
  full_marks_3: number;
}

const SubjectsSection = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("5");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showFullMarksWarning, setShowFullMarksWarning] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [hasExistingMarks, setHasExistingMarks] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    class_number: "5",
    full_marks_1: "30",
    full_marks_2: "50",
    full_marks_3: "20",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('class_number')
        .order('name');
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch subjects",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSubjectsByClass = (classNum: string) => {
    return subjects.filter(s => s.class_number.toString() === classNum);
  };

  const checkExistingMarks = async (subjectId: string) => {
    const { count } = await supabase
      .from('marks')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subjectId);
    
    return (count ?? 0) > 0;
  };

  const handleOpenDialog = async (subject?: Subject) => {
    if (subject) {
      setSelectedSubject(subject);
      setFormData({
        name: subject.name,
        class_number: subject.class_number.toString(),
        full_marks_1: subject.full_marks_1.toString(),
        full_marks_2: subject.full_marks_2.toString(),
        full_marks_3: subject.full_marks_3.toString(),
      });
      
      // Check if marks exist for this subject
      const marksExist = await checkExistingMarks(subject.id);
      setHasExistingMarks(marksExist);
    } else {
      setSelectedSubject(null);
      setHasExistingMarks(false);
      setFormData({
        name: "",
        class_number: selectedClass,
        full_marks_1: "30",
        full_marks_2: "50",
        full_marks_3: "20",
      });
    }
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = "Subject name is required";
    if (!formData.full_marks_1 || parseInt(formData.full_marks_1) <= 0) {
      newErrors.full_marks_1 = "Full marks must be positive";
    }
    if (!formData.full_marks_2 || parseInt(formData.full_marks_2) <= 0) {
      newErrors.full_marks_2 = "Full marks must be positive";
    }
    if (!formData.full_marks_3 || parseInt(formData.full_marks_3) <= 0) {
      newErrors.full_marks_3 = "Full marks must be positive";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Check if editing full marks when marks exist
    if (selectedSubject && hasExistingMarks) {
      const fullMarksChanged = 
        parseInt(formData.full_marks_1) !== selectedSubject.full_marks_1 ||
        parseInt(formData.full_marks_2) !== selectedSubject.full_marks_2 ||
        parseInt(formData.full_marks_3) !== selectedSubject.full_marks_3;
      
      if (fullMarksChanged && !showFullMarksWarning) {
        setShowFullMarksWarning(true);
        return;
      }
    }

    try {
      if (selectedSubject) {
        const { error } = await supabase
          .from('subjects')
          .update({
            name: formData.name.trim(),
            class_number: parseInt(formData.class_number),
            full_marks_1: parseInt(formData.full_marks_1),
            full_marks_2: parseInt(formData.full_marks_2),
            full_marks_3: parseInt(formData.full_marks_3),
          })
          .eq('id', selectedSubject.id);

        if (error) throw error;
        toast({ title: "Success", description: "Subject updated successfully" });
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert({
            name: formData.name.trim(),
            class_number: parseInt(formData.class_number),
            full_marks_1: parseInt(formData.full_marks_1),
            full_marks_2: parseInt(formData.full_marks_2),
            full_marks_3: parseInt(formData.full_marks_3),
          });

        if (error) {
          if (error.code === '23505') {
            setErrors({ name: "This subject already exists for this class" });
            return;
          }
          throw error;
        }
        toast({ title: "Success", description: "Subject added successfully" });
      }

      setIsDialogOpen(false);
      setShowFullMarksWarning(false);
      fetchSubjects();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save subject",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedSubject) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', selectedSubject.id);

      if (error) throw error;
      
      toast({ title: "Deleted", description: "Subject deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSelectedSubject(null);
      fetchSubjects();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete subject",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Subjects</h2>
          <p className="text-muted-foreground">Configure subjects and full marks for each class</p>
        </div>
        <div className="flex gap-2">
          <InitializeSubjectsButton 
            onComplete={fetchSubjects} 
            existingSubjectsCount={subjects.length}
          />
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> Add Subject
          </Button>
        </div>
      </div>

      {subjects.length === 0 && !isLoading && (
        <Alert className="border-primary/30 bg-primary/5">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <AlertDescription>
            No subjects configured yet. Use the "Initialize Default Subjects" button to quickly add the curriculum subjects for all classes, or add subjects manually.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={selectedClass} onValueChange={setSelectedClass}>
        <TabsList>
          <TabsTrigger value="5">Class 5</TabsTrigger>
          <TabsTrigger value="6">Class 6</TabsTrigger>
          <TabsTrigger value="7">Class 7</TabsTrigger>
          <TabsTrigger value="8">Class 8</TabsTrigger>
          <TabsTrigger value="9">Class 9</TabsTrigger>
        </TabsList>

        {["5", "6", "7", "8", "9"].map((classNum) => (
          <TabsContent key={classNum} value={classNum}>
            <Card>
              <CardHeader>
                <CardTitle>Class {classNum} Subjects</CardTitle>
                <CardDescription>
                  Subjects and their full marks for Summative Evaluation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : getSubjectsByClass(classNum).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No subjects added for Class {classNum}. Click "Add Subject" or "Initialize Default Subjects" to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject Name</TableHead>
                        <TableHead className="text-center">I (FM)</TableHead>
                        <TableHead className="text-center">II (FM)</TableHead>
                        <TableHead className="text-center">III (FM)</TableHead>
                        <TableHead className="text-center">Total FM</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSubjectsByClass(classNum).map((subject) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-medium">{subject.name}</TableCell>
                          <TableCell className="text-center">{subject.full_marks_1}</TableCell>
                          <TableCell className="text-center">{subject.full_marks_2}</TableCell>
                          <TableCell className="text-center">{subject.full_marks_3}</TableCell>
                          <TableCell className="text-center font-semibold">
                            {subject.full_marks_1 + subject.full_marks_2 + subject.full_marks_3}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(subject)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedSubject(subject);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setShowFullMarksWarning(false);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSubject ? "Edit Subject" : "Add New Subject"}
            </DialogTitle>
            <DialogDescription>
              Configure subject name and full marks for Summative Evaluation
            </DialogDescription>
          </DialogHeader>

          {showFullMarksWarning && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Marks have already been entered for this subject. Changing full marks may cause existing marks to exceed the new limit. Are you sure you want to proceed?
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Mathematics, English"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="class">Class *</Label>
              <Select
                value={formData.class_number}
                onValueChange={(v) => setFormData(prev => ({ ...prev, class_number: v }))}
              >
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fm1">Summative I (FM) *</Label>
                <Input
                  id="fm1"
                  type="number"
                  value={formData.full_marks_1}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_marks_1: e.target.value }))}
                  className={errors.full_marks_1 ? "border-destructive" : ""}
                />
                {errors.full_marks_1 && <p className="text-sm text-destructive mt-1">{errors.full_marks_1}</p>}
              </div>
              <div>
                <Label htmlFor="fm2">Summative II (FM) *</Label>
                <Input
                  id="fm2"
                  type="number"
                  value={formData.full_marks_2}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_marks_2: e.target.value }))}
                  className={errors.full_marks_2 ? "border-destructive" : ""}
                />
                {errors.full_marks_2 && <p className="text-sm text-destructive mt-1">{errors.full_marks_2}</p>}
              </div>
              <div>
                <Label htmlFor="fm3">Summative III (FM) *</Label>
                <Input
                  id="fm3"
                  type="number"
                  value={formData.full_marks_3}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_marks_3: e.target.value }))}
                  className={errors.full_marks_3 ? "border-destructive" : ""}
                />
                {errors.full_marks_3 && <p className="text-sm text-destructive mt-1">{errors.full_marks_3}</p>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false);
              setShowFullMarksWarning(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {showFullMarksWarning ? "Confirm Changes" : (selectedSubject ? "Update" : "Add")} Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSubject?.name}"? This will also delete all marks associated with this subject.
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

export default SubjectsSection;

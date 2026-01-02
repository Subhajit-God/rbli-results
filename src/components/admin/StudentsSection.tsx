import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  Download,
  CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
}

const studentSchema = z.object({
  student_id: z.string().min(1, "Student ID is required").max(50),
  name: z.string().min(1, "Name is required").max(100),
  class_number: z.number().min(5).max(9),
  section: z.string().min(1, "Section is required").max(10),
  roll_number: z.number().min(1, "Roll number is required"),
  father_name: z.string().min(1, "Father's name is required").max(100),
  mother_name: z.string().min(1, "Mother's name is required").max(100),
  date_of_birth: z.date(),
});

const StudentsSection = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    student_id: "",
    name: "",
    class_number: "5",
    section: "",
    roll_number: "",
    father_name: "",
    mother_name: "",
    date_of_birth: undefined as Date | undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('class_number')
        .order('roll_number');
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch students",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === "all" || student.class_number.toString() === classFilter;
    return matchesSearch && matchesClass;
  });

  const handleOpenDialog = (student?: Student) => {
    if (student) {
      setSelectedStudent(student);
      setFormData({
        student_id: student.student_id,
        name: student.name,
        class_number: student.class_number.toString(),
        section: student.section,
        roll_number: student.roll_number.toString(),
        father_name: student.father_name,
        mother_name: student.mother_name,
        date_of_birth: new Date(student.date_of_birth),
      });
    } else {
      setSelectedStudent(null);
      setFormData({
        student_id: "",
        name: "",
        class_number: "5",
        section: "",
        roll_number: "",
        father_name: "",
        mother_name: "",
        date_of_birth: undefined,
      });
    }
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const validated = studentSchema.parse({
        ...formData,
        class_number: parseInt(formData.class_number),
        roll_number: parseInt(formData.roll_number),
      });

      if (selectedStudent) {
        const { error } = await supabase
          .from('students')
          .update({
            student_id: validated.student_id,
            name: validated.name,
            class_number: validated.class_number,
            section: validated.section,
            roll_number: validated.roll_number,
            father_name: validated.father_name,
            mother_name: validated.mother_name,
            date_of_birth: format(validated.date_of_birth, 'yyyy-MM-dd'),
          })
          .eq('id', selectedStudent.id);

        if (error) throw error;
        toast({ title: "Success", description: "Student updated successfully" });
      } else {
        const { error } = await supabase
          .from('students')
          .insert({
            student_id: validated.student_id,
            name: validated.name,
            class_number: validated.class_number,
            section: validated.section,
            roll_number: validated.roll_number,
            father_name: validated.father_name,
            mother_name: validated.mother_name,
            date_of_birth: format(validated.date_of_birth, 'yyyy-MM-dd'),
          });

        if (error) {
          if (error.code === '23505') {
            setErrors({ student_id: "This Student ID already exists" });
            return;
          }
          throw error;
        }
        toast({ title: "Success", description: "Student added successfully" });
      }

      setIsDialogOpen(false);
      fetchStudents();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(e => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to save student",
        });
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', selectedStudent.id);

      if (error) throw error;
      
      toast({ title: "Deleted", description: "Student deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete student",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-9 w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="5">Class 5</SelectItem>
              <SelectItem value="6">Class 6</SelectItem>
              <SelectItem value="7">Class 7</SelectItem>
              <SelectItem value="8">Class 8</SelectItem>
              <SelectItem value="9">Class 9</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students found. Add your first student to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Father's Name</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.student_id}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.class_number}</TableCell>
                      <TableCell>{student.section}</TableCell>
                      <TableCell>{student.roll_number}</TableCell>
                      <TableCell>{student.father_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(student)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedStudent(student);
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent ? "Edit Student" : "Add New Student"}
            </DialogTitle>
            <DialogDescription>
              {selectedStudent ? "Update student details" : "Enter student details"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="student_id">Student ID *</Label>
              <Input
                id="student_id"
                value={formData.student_id}
                onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                className={errors.student_id ? "border-destructive" : ""}
              />
              {errors.student_id && <p className="text-sm text-destructive mt-1">{errors.student_id}</p>}
            </div>

            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <Label htmlFor="section">Section *</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                  placeholder="A, B, C..."
                  className={errors.section ? "border-destructive" : ""}
                />
                {errors.section && <p className="text-sm text-destructive mt-1">{errors.section}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="roll_number">Roll Number *</Label>
              <Input
                id="roll_number"
                type="number"
                value={formData.roll_number}
                onChange={(e) => setFormData(prev => ({ ...prev, roll_number: e.target.value }))}
                className={errors.roll_number ? "border-destructive" : ""}
              />
              {errors.roll_number && <p className="text-sm text-destructive mt-1">{errors.roll_number}</p>}
            </div>

            <div>
              <Label htmlFor="father_name">Father's Name *</Label>
              <Input
                id="father_name"
                value={formData.father_name}
                onChange={(e) => setFormData(prev => ({ ...prev, father_name: e.target.value }))}
                className={errors.father_name ? "border-destructive" : ""}
              />
              {errors.father_name && <p className="text-sm text-destructive mt-1">{errors.father_name}</p>}
            </div>

            <div>
              <Label htmlFor="mother_name">Mother's Name *</Label>
              <Input
                id="mother_name"
                value={formData.mother_name}
                onChange={(e) => setFormData(prev => ({ ...prev, mother_name: e.target.value }))}
                className={errors.mother_name ? "border-destructive" : ""}
              />
              {errors.mother_name && <p className="text-sm text-destructive mt-1">{errors.mother_name}</p>}
            </div>

            <div>
              <Label>Date of Birth *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date_of_birth && "text-muted-foreground",
                      errors.date_of_birth && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date_of_birth
                      ? format(formData.date_of_birth, "dd/MM/yyyy")
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date_of_birth}
                    onSelect={(date) => setFormData(prev => ({ ...prev, date_of_birth: date }))}
                    disabled={(date) => date > new Date() || date < new Date("1990-01-01")}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    captionLayout="dropdown-buttons"
                    fromYear={1990}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
              {errors.date_of_birth && <p className="text-sm text-destructive mt-1">{errors.date_of_birth}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {selectedStudent ? "Update" : "Add"} Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedStudent?.name}? This action cannot be undone and will also delete all associated marks and ranks.
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

export default StudentsSection;

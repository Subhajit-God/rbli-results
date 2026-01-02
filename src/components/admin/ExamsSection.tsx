import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Exam {
  id: string;
  name: string;
  academic_year: string;
  is_deployed: boolean;
  deployed_at: string | null;
  created_at: string;
}

const ExamsSection = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    academic_year: new Date().getFullYear().toString(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  const examNames = [
    "1st Summative Evaluation",
    "2nd Summative Evaluation",
    "3rd Summative Evaluation",
  ];

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

  const handleOpenDialog = (exam?: Exam) => {
    if (exam) {
      setSelectedExam(exam);
      setFormData({
        name: exam.name,
        academic_year: exam.academic_year,
      });
    } else {
      setSelectedExam(null);
      setFormData({
        name: "",
        academic_year: new Date().getFullYear().toString(),
      });
    }
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = "Exam name is required";
    if (!formData.academic_year) newErrors.academic_year = "Academic year is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (selectedExam) {
        const { error } = await supabase
          .from('exams')
          .update({
            name: formData.name,
            academic_year: formData.academic_year,
          })
          .eq('id', selectedExam.id);

        if (error) throw error;
        toast({ title: "Success", description: "Exam updated successfully" });
      } else {
        const { error } = await supabase
          .from('exams')
          .insert({
            name: formData.name,
            academic_year: formData.academic_year,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Exam created successfully" });
      }

      setIsDialogOpen(false);
      fetchExams();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save exam",
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
      
      toast({ title: "Deleted", description: "Exam deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSelectedExam(null);
      fetchExams();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete exam",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Examinations</h2>
          <p className="text-muted-foreground">Create and manage summative evaluations</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Create Exam
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No examinations created yet. Click "Create Exam" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className={exam.is_deployed ? "border-success/50" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{exam.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      Academic Year: {exam.academic_year}
                    </CardDescription>
                  </div>
                  <Badge variant={exam.is_deployed ? "default" : "secondary"}>
                    {exam.is_deployed ? "Deployed" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
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
                    Deployed on {format(new Date(exam.deployed_at), "dd MMM yyyy, hh:mm a")}
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
              {selectedExam ? "Edit Examination" : "Create New Examination"}
            </DialogTitle>
            <DialogDescription>
              Configure examination details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Examination Name *</Label>
              <Select
                value={formData.name}
                onValueChange={(v) => setFormData(prev => ({ ...prev, name: v }))}
              >
                <SelectTrigger className={errors.name ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select examination" />
                </SelectTrigger>
                <SelectContent>
                  {examNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {selectedExam ? "Update" : "Create"} Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Examination</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedExam?.name}"? This will also delete all associated marks and ranks.
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

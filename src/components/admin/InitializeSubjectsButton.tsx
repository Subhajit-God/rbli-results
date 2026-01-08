import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PRESET_SUBJECTS, getDefaultFullMarks } from "@/lib/presetSubjects";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";
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

interface InitializeSubjectsButtonProps {
  onComplete: () => void;
  existingSubjectsCount: number;
}

const InitializeSubjectsButton = ({ onComplete, existingSubjectsCount }: InitializeSubjectsButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const handleInitialize = async () => {
    setIsLoading(true);
    
    try {
      // Get all subjects that need to be inserted
      const subjectsToInsert: Array<{
        name: string;
        class_number: number;
        full_marks_1: number;
        full_marks_2: number;
        full_marks_3: number;
      }> = [];

      for (const [classNum, subjects] of Object.entries(PRESET_SUBJECTS)) {
        const classNumber = parseInt(classNum);
        const fullMarks = getDefaultFullMarks(classNumber);
        for (const subjectName of subjects) {
          subjectsToInsert.push({
            name: subjectName,
            class_number: classNumber,
            ...fullMarks
          });
        }
      }

      // Insert all subjects
      const { error } = await supabase
        .from('subjects')
        .insert(subjectsToInsert);

      if (error) {
        if (error.code === '23505') {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Some subjects already exist. Please check and try again.",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Success",
          description: `${subjectsToInsert.length} subjects initialized successfully!`,
        });
        onComplete();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to initialize subjects",
      });
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  if (existingSubjectsCount > 0) {
    return null;
  }

  return (
    <>
      <Button 
        onClick={() => setShowConfirmDialog(true)}
        variant="outline"
        className="border-primary/30 hover:bg-primary/10"
      >
        <Wand2 className="mr-2 h-4 w-4" />
        Initialize Default Subjects
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Initialize Default Subjects</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will add the default curriculum subjects for Classes 5-9:
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li><strong>Class 5:</strong> Bengali, English, Math, Our Environment, Work Education, Health Education</li>
                <li><strong>Class 6:</strong> Bengali, English, Geography, History, Science, Maths, Health Education, Work Education</li>
                <li><strong>Class 7-8:</strong> Bengali, English, Sanskrit, Geography, History, Science, Maths, Health Education, Work Education</li>
                <li><strong>Class 9:</strong> Bengali, English, Geography, Life and Physical Science, Maths, History</li>
              </ul>
              <p className="text-muted-foreground">
                Default full marks: I = 30, II = 50, III = 20 (Class 6-8: III = 70)
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleInitialize} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                "Initialize Subjects"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InitializeSubjectsButton;

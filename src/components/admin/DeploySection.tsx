import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Rocket, Undo, AlertTriangle, CheckCircle, XCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Exam {
  id: string;
  name: string;
  academic_year: string;
  is_deployed: boolean;
  deployed_at: string | null;
}

interface DeploymentCheck {
  name: string;
  passed: boolean;
  message: string;
}

const DeploySection = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [checks, setChecks] = useState<DeploymentCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setExams(data);
    setIsLoading(false);
  };

  const currentExam = exams.find(e => e.id === selectedExam);
  const canDeploy = checks.length > 0 && checks.every(c => c.passed);

  const runDeploymentChecks = async () => {
    if (!selectedExam) return;

    setIsChecking(true);
    const newChecks: DeploymentCheck[] = [];

    try {
      // Check 1: Students exist
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      
      newChecks.push({
        name: "Students Added",
        passed: (studentCount || 0) > 0,
        message: studentCount ? `${studentCount} students found` : "No students found",
      });

      // Check 2: Subjects configured
      const { count: subjectCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true });
      
      newChecks.push({
        name: "Subjects Configured",
        passed: (subjectCount || 0) > 0,
        message: subjectCount ? `${subjectCount} subjects found` : "No subjects configured",
      });

      // Check 3: Marks entered
      const { data: marks } = await supabase
        .from('marks')
        .select('*')
        .eq('exam_id', selectedExam);
      
      newChecks.push({
        name: "Marks Entered",
        passed: (marks?.length || 0) > 0,
        message: marks?.length ? `${marks.length} mark entries found` : "No marks entered",
      });

      // Check 4: All marks locked
      const unlockedMarks = marks?.filter(m => !m.is_locked) || [];
      newChecks.push({
        name: "Marks Locked",
        passed: unlockedMarks.length === 0 && (marks?.length || 0) > 0,
        message: unlockedMarks.length > 0 
          ? `${unlockedMarks.length} entries still unlocked`
          : "All marks are locked",
      });

      // Check 5: Ranks calculated
      const { data: ranks } = await supabase
        .from('ranks')
        .select('*')
        .eq('exam_id', selectedExam);
      
      newChecks.push({
        name: "Ranks Calculated",
        passed: (ranks?.length || 0) > 0,
        message: ranks?.length ? `${ranks.length} ranks assigned` : "Ranks not calculated",
      });

      // Check 6: No rank conflicts
      const conflicts = ranks?.filter(r => r.has_conflict) || [];
      newChecks.push({
        name: "No Rank Conflicts",
        passed: conflicts.length === 0,
        message: conflicts.length > 0 
          ? `${conflicts.length} unresolved conflicts`
          : "All conflicts resolved",
      });

      setChecks(newChecks);
    } catch (error) {
      console.error('Error running checks:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to run deployment checks",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedExam) return;

    setIsDeploying(true);
    try {
      const { error } = await supabase
        .from('exams')
        .update({ 
          is_deployed: true, 
          deployed_at: new Date().toISOString() 
        })
        .eq('id', selectedExam);

      if (error) throw error;

      toast({ 
        title: "Deployed", 
        description: "Results are now visible to students" 
      });
      
      setShowDeployDialog(false);
      fetchExams();
      setChecks([]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to deploy results",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedExam) return;

    setIsRollingBack(true);
    try {
      const { error } = await supabase
        .from('exams')
        .update({ 
          is_deployed: false, 
          deployed_at: null 
        })
        .eq('id', selectedExam);

      if (error) throw error;

      toast({ 
        title: "Rolled Back", 
        description: "Results are now hidden from students" 
      });
      
      setShowRollbackDialog(false);
      fetchExams();
      setChecks([]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to rollback results",
      });
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Deploy Results</h2>
        <p className="text-muted-foreground">Publish or rollback examination results</p>
      </div>

      {/* Exam Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-md">
              <Label>Select Examination</Label>
              <Select value={selectedExam} onValueChange={(v) => {
                setSelectedExam(v);
                setChecks([]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an examination" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name} ({exam.academic_year})
                      {exam.is_deployed && " ✓ Deployed"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentExam && (
              <Badge variant={currentExam.is_deployed ? "default" : "secondary"} className="h-9 px-4">
                {currentExam.is_deployed ? (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" /> Live
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 h-3 w-3" /> Draft
                  </>
                )}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedExam && currentExam && (
        <>
          {/* Pre-deployment Checks */}
          {!currentExam.is_deployed && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Pre-Deployment Checks
                </CardTitle>
                <CardDescription>
                  Verify all requirements before publishing results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={runDeploymentChecks} disabled={isChecking}>
                  {isChecking ? "Checking..." : "Run Checks"}
                </Button>

                {checks.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {checks.map((check, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          check.passed ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {check.passed ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          <span className="font-medium">{check.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{check.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {checks.length > 0 && !canDeploy && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Some checks failed. Please resolve all issues before deploying.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Deploy/Rollback Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                {currentExam.is_deployed 
                  ? "Results are currently live. Students can view their results."
                  : "Deploy results to make them visible to students."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              {currentExam.is_deployed ? (
                <Button 
                  variant="destructive"
                  onClick={() => setShowRollbackDialog(true)}
                >
                  <Undo className="mr-2 h-4 w-4" />
                  Rollback Results
                </Button>
              ) : (
                <Button 
                  onClick={() => setShowDeployDialog(true)}
                  disabled={!canDeploy}
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  Deploy Results
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Deploy Confirmation Dialog */}
      <AlertDialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deploy Results</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deploy "{currentExam?.name}"? Results will become immediately visible to all students.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeploy} disabled={isDeploying}>
              {isDeploying ? "Deploying..." : "Deploy Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback Results</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback "{currentExam?.name}"? Results will be immediately hidden from students.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRollback} 
              disabled={isRollingBack}
              className="bg-destructive text-destructive-foreground"
            >
              {isRollingBack ? "Rolling Back..." : "Rollback Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeploySection;

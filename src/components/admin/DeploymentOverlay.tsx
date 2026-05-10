import { Lock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DeploymentOverlayProps {
  onNavigateToAcademicYear: () => void;
  deployedYear?: string;
}

/**
 * Hard read-only lock banner. Shown above Students / Marks / Ranks / Subjects
 * / Settings whenever the current academic year is already deployed.
 *
 * The banner cannot be dismissed — it always renders, and the section beneath
 * is wrapped in a `pointer-events-none` overlay so no edits/imports/deletes
 * can be triggered from the UI. Database-level RLS + the
 * `enforce_class_lock_on_marks` trigger remain the source of truth.
 */
const DeploymentOverlay = ({ onNavigateToAcademicYear, deployedYear }: DeploymentOverlayProps) => {
  return (
    <Alert className="mb-4 border-warning/60 bg-warning/10">
      <Lock className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning">
        Locked — Results Deployed for {deployedYear || "Current Year"}
      </AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
        <span className="text-sm text-muted-foreground flex-1">
          This tab is read-only. To edit students, marks, or ranks, roll back the
          deployment from the Deploy tab or create a new academic year.
        </span>
        <Button
          variant="outline"
          size="sm"
          className="border-warning/50 hover:bg-warning/10"
          onClick={onNavigateToAcademicYear}
        >
          <Calendar className="mr-2 h-3 w-3" />
          Academic Year
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default DeploymentOverlay;

import { AlertTriangle, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";

interface DeploymentOverlayProps {
  onNavigateToAcademicYear: () => void;
  deployedYear?: string;
}

const DeploymentOverlay = ({ onNavigateToAcademicYear, deployedYear }: DeploymentOverlayProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <Alert className="mb-4 border-warning/50 bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="flex items-center justify-between">
        <span>Results Deployed for {deployedYear || 'Current Year'}</span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 -mr-2"
          onClick={() => setIsDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
        <span className="text-sm text-muted-foreground flex-1">
          To make changes, create a new academic year or update the current one.
        </span>
        <Button 
          variant="outline" 
          size="sm"
          className="border-warning/50 hover:bg-warning/10"
          onClick={onNavigateToAcademicYear}
        >
          <Calendar className="mr-2 h-3 w-3" />
          Go to Academic Year
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default DeploymentOverlay;

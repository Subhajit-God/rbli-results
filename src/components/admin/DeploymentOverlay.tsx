import { AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DeploymentOverlayProps {
  onNavigateToAcademicYear: () => void;
  deployedYear?: string;
}

const DeploymentOverlay = ({ onNavigateToAcademicYear, deployedYear }: DeploymentOverlayProps) => {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      {/* Blur backdrop */}
      <div className="absolute inset-0 backdrop-blur-md bg-background/60" />
      
      {/* Overlay content */}
      <Card className="relative z-10 max-w-md mx-4 border-warning/50 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <CardTitle className="text-xl">Results Deployed</CardTitle>
          <CardDescription className="text-base">
            The results for Academic Year {deployedYear || ''} have been published.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            To make changes or prepare for a new academic year, please create a new academic year 
            or update the existing one. This will allow you to:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Promote students to their next class</li>
            <li>Reset marks and ranks for new evaluation</li>
            <li>Generate Class 9 promotion data</li>
          </ul>
          <Button 
            className="w-full" 
            size="lg"
            onClick={onNavigateToAcademicYear}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Go to Academic Year
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeploymentOverlay;

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ProgressLoaderProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
  className?: string;
}

export function ProgressLoader({ 
  isLoading, 
  progress, 
  message = "Loading...", 
  className 
}: ProgressLoaderProps) {
  if (!isLoading) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
      "animate-fade-in",
      className
    )}>
      <div className="bg-card p-6 rounded-xl shadow-official border border-border w-80 space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-foreground font-medium">{message}</span>
        </div>
        {progress !== undefined && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {Math.round(progress)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function InlineLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-4">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}

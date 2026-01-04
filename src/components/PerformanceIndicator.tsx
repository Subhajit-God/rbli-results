import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PerformanceIndicatorProps {
  value: number;
  maxValue: number;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PerformanceIndicator({ 
  value, 
  maxValue, 
  showProgress = true,
  size = "md",
  className 
}: PerformanceIndicatorProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  const getColorClass = () => {
    if (percentage >= 70) return "text-success";
    if (percentage >= 45) return "text-warning";
    return "text-destructive";
  };

  const getProgressColor = () => {
    if (percentage >= 70) return "bg-success";
    if (percentage >= 45) return "bg-warning";
    return "bg-destructive";
  };

  const getIcon = () => {
    if (percentage >= 70) return <TrendingUp className="h-3 w-3" />;
    if (percentage >= 45) return <Minus className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className={cn("flex items-center gap-1", getColorClass(), sizeClasses[size])}>
        {getIcon()}
        <span className="font-semibold">{percentage.toFixed(1)}%</span>
      </div>
      {showProgress && (
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div 
            className={cn("h-full transition-all duration-500 ease-out", getProgressColor())}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface SubjectPerformanceCardProps {
  subject: string;
  marks: number;
  fullMarks: number;
  className?: string;
}

export function SubjectPerformanceCard({ 
  subject, 
  marks, 
  fullMarks, 
  className 
}: SubjectPerformanceCardProps) {
  const percentage = fullMarks > 0 ? (marks / fullMarks) * 100 : 0;
  
  const getBgGradient = () => {
    if (percentage >= 70) return "from-success/10 to-success/5";
    if (percentage >= 45) return "from-warning/10 to-warning/5";
    return "from-destructive/10 to-destructive/5";
  };

  const getBorderColor = () => {
    if (percentage >= 70) return "border-success/30";
    if (percentage >= 45) return "border-warning/30";
    return "border-destructive/30";
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border bg-gradient-to-br transition-all hover:shadow-md",
      getBgGradient(),
      getBorderColor(),
      className
    )}>
      <h4 className="font-medium text-foreground mb-2 truncate">{subject}</h4>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold text-foreground">{marks}</span>
        <span className="text-muted-foreground">/ {fullMarks}</span>
      </div>
      <PerformanceIndicator value={marks} maxValue={fullMarks} size="sm" />
    </div>
  );
}

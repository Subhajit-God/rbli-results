import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AbsentBadgeProps {
  value: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Check if a mark value represents an absent status
export const isAbsent = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return value.toUpperCase() === 'AB';
};

// Check if a mark value represents an exempt status
export const isExempt = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return value.toUpperCase() === 'EX';
};

// Check if a mark value is a special status (AB or EX)
export const isSpecialStatus = (value: string | null | undefined): boolean => {
  return isAbsent(value) || isExempt(value);
};

// Render marks with special styling for AB/EX
export const AbsentBadge = ({ value, className, size = "md" }: AbsentBadgeProps) => {
  const upperValue = value.toUpperCase();
  
  if (upperValue === 'AB') {
    return (
      <Badge 
        variant="destructive" 
        className={cn(
          "font-semibold",
          size === "sm" && "text-xs px-1.5 py-0.5",
          size === "md" && "text-sm px-2 py-0.5",
          size === "lg" && "text-base px-2.5 py-1",
          className
        )}
      >
        AB
      </Badge>
    );
  }
  
  if (upperValue === 'EX') {
    return (
      <Badge 
        variant="secondary" 
        className={cn(
          "font-semibold bg-muted text-muted-foreground",
          size === "sm" && "text-xs px-1.5 py-0.5",
          size === "md" && "text-sm px-2 py-0.5",
          size === "lg" && "text-base px-2.5 py-1",
          className
        )}
      >
        EX
      </Badge>
    );
  }
  
  return null;
};

// Component that renders marks value with AB/EX badge when applicable
export const MarksDisplay = ({ 
  value, 
  fullMarks,
  className,
  showFullMarks = true,
  size = "md"
}: { 
  value: string | null | undefined;
  fullMarks?: number;
  className?: string;
  showFullMarks?: boolean;
  size?: "sm" | "md" | "lg";
}) => {
  if (!value || value === '') {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  if (isAbsent(value)) {
    return <AbsentBadge value="AB" size={size} className={className} />;
  }

  if (isExempt(value)) {
    return <AbsentBadge value="EX" size={size} className={className} />;
  }

  return (
    <span className={className}>
      <span className="font-medium">{value}</span>
      {showFullMarks && fullMarks !== undefined && (
        <span className="text-muted-foreground text-xs ml-1">({fullMarks})</span>
      )}
    </span>
  );
};

export default AbsentBadge;

import { cn } from "@/lib/utils";
import { PerformanceIndicator } from "@/components/PerformanceIndicator";
import { MarksDisplay, isAbsent, isExempt } from "@/components/AbsentBadge";

interface MarksRow {
  subject: string;
  marks1: string;
  fullMarks1: number;
  marks2: string;
  fullMarks2: number;
  marks3: string;
  fullMarks3: number;
  total: number;
  fullTotal: number;
  percentage: number;
}

interface MarksTableMobileProps {
  marks: MarksRow[];
}

const MarksTableMobile = ({ marks }: MarksTableMobileProps) => {
  return (
    <div className="md:hidden space-y-3">
      {marks.map((row, index) => (
        <div 
          key={index}
          className={cn(
            "p-4 rounded-xl border border-border transition-all duration-200",
            index % 2 === 0 ? "bg-card" : "bg-muted/20"
          )}
        >
          {/* Subject Name & Total */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-foreground">{row.subject}</h4>
            <span className="text-sm font-bold text-primary">
              {row.total}/{row.fullTotal}
            </span>
          </div>

          {/* Marks Grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <span className="text-xs text-muted-foreground block mb-1">Paper I</span>
              {isAbsent(row.marks1) || isExempt(row.marks1) ? (
                <MarksDisplay value={row.marks1} size="sm" />
              ) : (
                <span className="font-medium text-sm">
                  {row.marks1}<span className="text-muted-foreground text-xs">/{row.fullMarks1}</span>
                </span>
              )}
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <span className="text-xs text-muted-foreground block mb-1">Paper II</span>
              {isAbsent(row.marks2) || isExempt(row.marks2) ? (
                <MarksDisplay value={row.marks2} size="sm" />
              ) : (
                <span className="font-medium text-sm">
                  {row.marks2}<span className="text-muted-foreground text-xs">/{row.fullMarks2}</span>
                </span>
              )}
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <span className="text-xs text-muted-foreground block mb-1">Paper III</span>
              {isAbsent(row.marks3) || isExempt(row.marks3) ? (
                <MarksDisplay value={row.marks3} size="sm" />
              ) : (
                <span className="font-medium text-sm">
                  {row.marks3}<span className="text-muted-foreground text-xs">/{row.fullMarks3}</span>
                </span>
              )}
            </div>
          </div>

          {/* Performance Bar */}
          <PerformanceIndicator 
            value={row.total} 
            maxValue={row.fullTotal} 
            size="sm"
          />
        </div>
      ))}
    </div>
  );
};

export default MarksTableMobile;

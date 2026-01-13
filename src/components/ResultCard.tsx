import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Award, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import schoolLogo from "@/assets/school-logo.png";
import { PerformanceIndicator } from "@/components/PerformanceIndicator";
import { AchievementsList } from "@/components/AchievementBadge";
import { MarksDisplay, isAbsent, isExempt } from "@/components/AbsentBadge";
interface StudentDetails {
  name: string;
  classNumber: number;
  section: string;
  rollNumber: number;
  studentId: string;
  fatherName: string;
  motherName: string;
}

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

interface ResultSummary {
  grandTotal: number;
  fullMarks: number;
  percentage: number;
  grade: string;
  isPassed: boolean;
  rank: number;
}

interface ResultCardProps {
  examName: string;
  student: StudentDetails;
  marks: MarksRow[];
  summary: ResultSummary;
  onDownloadPDF?: () => void;
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A+': return 'bg-success text-success-foreground';
    case 'A': return 'bg-success/90 text-success-foreground';
    case 'B+': return 'bg-primary text-primary-foreground';
    case 'B': return 'bg-primary/90 text-primary-foreground';
    case 'C+': return 'bg-warning text-warning-foreground';
    case 'C': return 'bg-warning/90 text-warning-foreground';
    default: return 'bg-destructive text-destructive-foreground';
  }
};

const getPerformanceColor = (percentage: number) => {
  if (percentage >= 70) return 'text-success';
  if (percentage >= 45) return 'text-warning';
  return 'text-destructive';
};

const getPerformanceMessage = (percentage: number) => {
  if (percentage >= 90) return { text: "Outstanding!", emoji: "🎉" };
  if (percentage >= 70) return { text: "Excellent!", emoji: "🌟" };
  if (percentage >= 45) return { text: "Good Job!", emoji: "👍" };
  return { text: "Keep Going!", emoji: "💪" };
};

const getPerformanceBgColor = (percentage: number) => {
  if (percentage >= 90) return "from-success/20 to-success/10 border-success/40";
  if (percentage >= 70) return "from-primary/20 to-primary/10 border-primary/40";
  if (percentage >= 45) return "from-warning/20 to-warning/10 border-warning/40";
  return "from-destructive/20 to-destructive/10 border-destructive/40";
};

const ResultCard = ({ examName, student, marks, summary, onDownloadPDF }: ResultCardProps) => {
  const [showPerformanceBanner, setShowPerformanceBanner] = useState(true);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    // Random duration between 2-5 seconds
    const duration = 2000 + Math.random() * 3000;
    
    const hideTimer = setTimeout(() => {
      setIsHiding(true);
      // Wait for animation to complete before removing
      setTimeout(() => setShowPerformanceBanner(false), 500);
    }, duration);

    return () => clearTimeout(hideTimer);
  }, []);

  const performanceMessage = getPerformanceMessage(summary.percentage);

  return (
    <Card className="glass-effect neon-border overflow-hidden print:shadow-none print:border transition-all duration-300 result-card-print">
      {/* Header */}
      <CardHeader className="header-gradient text-primary-foreground p-6 md:p-8 print:p-3 relative overflow-hidden card-header-print">
        {/* Decorative background - hidden in print */}
        <div className="absolute inset-0 opacity-10 print-hide-decoration">
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent rounded-full translate-x-1/2 -translate-y-1/2" />
        </div>
        
        <div className="flex items-center gap-4 justify-center relative z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-md print-hide-decoration" />
            <img 
              src={schoolLogo} 
              alt="School Logo" 
              className="w-16 h-16 md:w-20 md:h-20 print:w-12 print:h-12 rounded-full border-2 border-primary-foreground/50 relative z-10 shadow-lg print:shadow-none"
            />
          </div>
          <div className="text-center">
            <h2 className="text-xl md:text-2xl print:text-lg font-bold drop-shadow-sm print:drop-shadow-none">Ramjibanpur Babulal Institution</h2>
            <p className="text-sm print:text-xs text-primary-foreground/70 print:text-primary-foreground/90">Estd. 1925</p>
          </div>
        </div>
        <div className="text-center mt-5 print:mt-2 relative z-10">
          <Badge className="gold-gradient text-accent-foreground border-none text-sm print:text-xs px-6 py-1.5 print:px-4 print:py-1 shadow-md print:shadow-none badge-print-exam">
            {examName}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 md:p-8 print:p-3 space-y-6 print:space-y-3 card-content-print">
        {/* Performance Banner - Auto-hides after 2-5 seconds, hidden in print */}
        {showPerformanceBanner && summary.isPassed && (
          <div 
            className={cn(
              "relative p-6 rounded-2xl border-2 bg-gradient-to-br text-center transition-all duration-500 print:hidden",
              getPerformanceBgColor(summary.percentage),
              isHiding ? "opacity-0 scale-95 -translate-y-4" : "opacity-100 scale-100 translate-y-0"
            )}
          >
            {/* Decorative stars */}
            <div className="absolute -top-3 -left-3 text-accent animate-pulse text-2xl">✨</div>
            <div className="absolute -top-3 -right-3 text-accent animate-pulse text-2xl">✨</div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-accent animate-pulse text-xl">✨</div>
            
            {/* Trophy icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success/20 text-success mb-3 mx-auto">
              <Trophy className="h-8 w-8" />
            </div>
            
            {/* Performance message */}
            <h3 className={cn(
              "text-2xl font-bold mb-2",
              summary.percentage >= 90 ? "text-success" : 
              summary.percentage >= 70 ? "text-primary" : 
              summary.percentage >= 45 ? "text-warning" : "text-destructive"
            )}>
              {performanceMessage.text} {performanceMessage.emoji}
            </h3>
            
            <p className="text-muted-foreground mb-4">
              You scored {summary.percentage.toFixed(1)}% with Grade {summary.grade}
            </p>
            
            {/* Achievement badges */}
            <div className="flex justify-center">
              <AchievementsList 
                percentage={summary.percentage} 
                rank={summary.rank} 
              />
            </div>
          </div>
        )}

        {/* Student Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-4 gap-4 print:gap-2 p-5 print:p-3 bg-muted/30 print:bg-transparent rounded-xl border border-border transition-all duration-200 hover:bg-muted/40 student-details-print">
          {[
            { label: "Student Name", value: student.name },
            { label: "Class", value: student.classNumber },
            { label: "Section", value: student.section },
            { label: "Roll Number", value: student.rollNumber },
            { label: "Student ID", value: student.studentId },
            { label: "Father's Name", value: student.fatherName },
            { label: "Mother's Name", value: student.motherName },
          ].map((item, i) => (
            <div key={i} className="space-y-1 print:space-y-0">
              <span className="text-xs print:text-[9px] text-muted-foreground font-medium uppercase tracking-wide">{item.label}</span>
              <p className="font-semibold text-foreground print:text-[11px]">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Marks Table */}
        <div className="overflow-x-auto rounded-xl border border-border print:rounded-none print:overflow-visible">
          <table className="w-full border-collapse text-sm print:text-[10px] marks-table-print">
            <thead>
              <tr className="header-gradient text-primary-foreground">
                <th className="p-3 print:p-2 text-left font-semibold">Subject</th>
                <th className="p-3 print:p-2 text-center font-semibold">I (FM)</th>
                <th className="p-3 print:p-2 text-center font-semibold">II (FM)</th>
                <th className="p-3 print:p-2 text-center font-semibold">III (FM)</th>
                <th className="p-3 print:p-2 text-center font-semibold">Total</th>
                <th className="p-3 print:p-2 text-center font-semibold print:hidden">Performance</th>
                <th className="hidden print:table-cell p-2 text-center font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((row, index) => (
                <tr 
                  key={index} 
                  className={cn(
                    "transition-all duration-200 hover:bg-muted/50 print:hover:bg-transparent",
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  )}
                >
                  <td className="p-3 print:p-1.5 font-medium border-t border-border">{row.subject}</td>
                  <td className="p-3 print:p-1.5 text-center border-t border-border">
                    {isAbsent(row.marks1) ? (
                      <span className="print:text-red-600 print:font-medium"><MarksDisplay value={row.marks1} size="sm" /></span>
                    ) : isExempt(row.marks1) ? (
                      <span className="print:text-gray-500"><MarksDisplay value={row.marks1} size="sm" /></span>
                    ) : (
                      <>
                        <span className="font-medium">{row.marks1}</span>
                        <span className="text-muted-foreground text-xs ml-1 print:text-[8px]">({row.fullMarks1})</span>
                      </>
                    )}
                  </td>
                  <td className="p-3 print:p-1.5 text-center border-t border-border">
                    {isAbsent(row.marks2) ? (
                      <span className="print:text-red-600 print:font-medium"><MarksDisplay value={row.marks2} size="sm" /></span>
                    ) : isExempt(row.marks2) ? (
                      <span className="print:text-gray-500"><MarksDisplay value={row.marks2} size="sm" /></span>
                    ) : (
                      <>
                        <span className="font-medium">{row.marks2}</span>
                        <span className="text-muted-foreground text-xs ml-1 print:text-[8px]">({row.fullMarks2})</span>
                      </>
                    )}
                  </td>
                  <td className="p-3 print:p-1.5 text-center border-t border-border">
                    {isAbsent(row.marks3) ? (
                      <span className="print:text-red-600 print:font-medium"><MarksDisplay value={row.marks3} size="sm" /></span>
                    ) : isExempt(row.marks3) ? (
                      <span className="print:text-gray-500"><MarksDisplay value={row.marks3} size="sm" /></span>
                    ) : (
                      <>
                        <span className="font-medium">{row.marks3}</span>
                        <span className="text-muted-foreground text-xs ml-1 print:text-[8px]">({row.fullMarks3})</span>
                      </>
                    )}
                  </td>
                  <td className="p-3 print:p-1.5 text-center border-t border-border font-bold text-primary print:text-black">
                    {row.total}/{row.fullTotal}
                  </td>
                  <td className="p-3 print:p-1.5 border-t border-border print:hidden">
                    <div className="flex items-center justify-center">
                      <PerformanceIndicator 
                        value={row.total} 
                        maxValue={row.fullTotal} 
                        size="sm"
                      />
                    </div>
                  </td>
                  <td className="hidden print:table-cell p-1.5 text-center border-t border-border font-medium">
                    {row.percentage.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Result Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 print:grid-cols-5 gap-3 md:gap-4 print:gap-2">
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 print:bg-transparent p-4 print:p-2 rounded-xl print:rounded-md text-center border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] print:hover:shadow-none print:hover:scale-100 summary-print">
            <span className="text-xs print:text-[8px] text-muted-foreground font-medium uppercase tracking-wide block mb-1">Grand Total</span>
            <p className="text-xl md:text-2xl print:text-sm font-bold text-foreground">
              {summary.grandTotal}<span className="text-muted-foreground text-base print:text-xs font-normal">/{summary.fullMarks}</span>
            </p>
          </div>
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 print:bg-transparent p-4 print:p-2 rounded-xl print:rounded-md text-center border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] print:hover:shadow-none print:hover:scale-100 summary-print">
            <span className="text-xs print:text-[8px] text-muted-foreground font-medium uppercase tracking-wide block mb-1">Percentage</span>
            <p className={cn(
              "text-xl md:text-2xl print:text-sm font-bold flex items-center justify-center gap-1",
              getPerformanceColor(summary.percentage),
              "print:text-black"
            )}>
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 print:h-3 print:w-3" />
              {summary.percentage.toFixed(1)}%
            </p>
          </div>
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 print:bg-transparent p-4 print:p-2 rounded-xl print:rounded-md text-center border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] print:hover:shadow-none print:hover:scale-100 summary-print">
            <span className="text-xs print:text-[8px] text-muted-foreground font-medium uppercase tracking-wide block mb-2 print:mb-1">Grade</span>
            <Badge className={cn("text-lg print:text-xs px-4 py-1 print:px-2 print:py-0.5", getGradeColor(summary.grade), "badge-print badge-print-grade")}>
              {summary.grade}
            </Badge>
          </div>
          <div className={cn(
            "p-4 print:p-2 rounded-xl print:rounded-md text-center border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] print:hover:shadow-none print:hover:scale-100 summary-print",
            summary.isPassed 
              ? 'bg-gradient-to-br from-success/10 to-success/5 border-success/30 print:bg-transparent' 
              : 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30 print:bg-transparent'
          )}>
            <span className="text-xs print:text-[8px] text-muted-foreground font-medium uppercase tracking-wide block mb-2 print:mb-1">Result</span>
            <Badge 
              className={cn(
                "text-base print:text-xs px-4 py-1 print:px-2 print:py-0.5 animate-pulse print:animate-none badge-print",
                summary.isPassed 
                  ? 'bg-success text-success-foreground badge-print-success' 
                  : 'bg-destructive text-destructive-foreground badge-print-fail'
              )}
            >
              {summary.isPassed ? 'PASS ✓' : 'FAIL'}
            </Badge>
          </div>
          <div className="col-span-2 md:col-span-1 print:col-span-1 bg-gradient-to-br from-secondary to-secondary/80 print:bg-transparent p-4 print:p-2 rounded-xl print:rounded-md text-center border border-accent/30 print:border-border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] print:hover:shadow-none print:hover:scale-100 summary-print">
            <span className="text-xs print:text-[8px] text-secondary-foreground/70 print:text-muted-foreground font-medium uppercase tracking-wide block mb-1">Class Rank</span>
            <p className="text-xl md:text-2xl print:text-sm font-bold text-secondary-foreground print:text-foreground flex items-center justify-center gap-2 print:gap-1">
              <Award className="h-5 w-5 md:h-6 md:w-6 print:h-3 print:w-3 text-accent print:text-primary" />
              {summary.rank}
            </p>
          </div>
        </div>

        {/* Signature Area - Only visible in print */}
        <div className="hidden print:flex justify-between items-end mt-6 pt-4 border-t border-dashed border-gray-400 signature-area-print">
          <div className="text-center signature-box-print">
            <div className="signature-line-print">Class Teacher</div>
          </div>
          <div className="text-center signature-box-print">
            <div className="signature-line-print">Exam Controller</div>
          </div>
          <div className="text-center signature-box-print">
            <div className="signature-line-print">Principal</div>
          </div>
        </div>

        {/* Download Button */}
        {onDownloadPDF && (
          <div className="flex justify-center pt-4 print:hidden">
            <Button 
              onClick={onDownloadPDF}
              size="lg"
              className="gold-gradient text-accent-foreground hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Download className="mr-2 h-5 w-5" />
              Download PDF Result
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultCard;

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Award, TrendingUp } from "lucide-react";
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

const ResultCard = ({ examName, student, marks, summary, onDownloadPDF }: ResultCardProps) => {
  return (
    <Card className="shadow-official border-2 border-primary/10 overflow-hidden print:shadow-none print:border transition-all duration-300">
      {/* Header */}
      <CardHeader className="header-gradient text-primary-foreground p-6 md:p-8 print:p-4 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent rounded-full translate-x-1/2 -translate-y-1/2" />
        </div>
        
        <div className="flex items-center gap-4 justify-center relative z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-md" />
            <img 
              src={schoolLogo} 
              alt="School Logo" 
              className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-primary-foreground/50 relative z-10 shadow-lg"
            />
          </div>
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold drop-shadow-sm">Ramjibanpur Babulal Institution</h2>
            <p className="text-sm text-primary-foreground/70">Estd. 1925</p>
          </div>
        </div>
        <div className="text-center mt-5 relative z-10">
          <Badge className="gold-gradient text-accent-foreground border-none text-sm px-6 py-1.5 shadow-md">
            {examName}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Achievement Badges */}
        {summary.isPassed && (
          <div className="flex justify-center animate-fade-in">
            <AchievementsList 
              percentage={summary.percentage} 
              rank={summary.rank} 
            />
          </div>
        )}

        {/* Student Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-muted/30 rounded-xl border border-border transition-all duration-200 hover:bg-muted/40">
          {[
            { label: "Student Name", value: student.name },
            { label: "Class", value: student.classNumber },
            { label: "Section", value: student.section },
            { label: "Roll Number", value: student.rollNumber },
            { label: "Student ID", value: student.studentId },
            { label: "Father's Name", value: student.fatherName },
          ].map((item, i) => (
            <div key={i} className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{item.label}</span>
              <p className="font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
          <div className="col-span-2 md:col-span-3 space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Mother's Name</span>
            <p className="font-semibold text-foreground">{student.motherName}</p>
          </div>
        </div>

        {/* Marks Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="header-gradient text-primary-foreground">
                <th className="p-3 text-left font-semibold">Subject</th>
                <th className="p-3 text-center font-semibold">I (FM)</th>
                <th className="p-3 text-center font-semibold">II (FM)</th>
                <th className="p-3 text-center font-semibold">III (FM)</th>
                <th className="p-3 text-center font-semibold">Total</th>
                <th className="p-3 text-center font-semibold">Performance</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((row, index) => (
                <tr 
                  key={index} 
                  className={cn(
                    "transition-all duration-200 hover:bg-muted/50",
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  )}
                >
                  <td className="p-3 font-medium border-t border-border">{row.subject}</td>
                  <td className="p-3 text-center border-t border-border">
                    {isAbsent(row.marks1) ? (
                      <MarksDisplay value={row.marks1} size="sm" />
                    ) : isExempt(row.marks1) ? (
                      <MarksDisplay value={row.marks1} size="sm" />
                    ) : (
                      <>
                        <span className="font-medium">{row.marks1}</span>
                        <span className="text-muted-foreground text-xs ml-1">({row.fullMarks1})</span>
                      </>
                    )}
                  </td>
                  <td className="p-3 text-center border-t border-border">
                    {isAbsent(row.marks2) ? (
                      <MarksDisplay value={row.marks2} size="sm" />
                    ) : isExempt(row.marks2) ? (
                      <MarksDisplay value={row.marks2} size="sm" />
                    ) : (
                      <>
                        <span className="font-medium">{row.marks2}</span>
                        <span className="text-muted-foreground text-xs ml-1">({row.fullMarks2})</span>
                      </>
                    )}
                  </td>
                  <td className="p-3 text-center border-t border-border">
                    {isAbsent(row.marks3) ? (
                      <MarksDisplay value={row.marks3} size="sm" />
                    ) : isExempt(row.marks3) ? (
                      <MarksDisplay value={row.marks3} size="sm" />
                    ) : (
                      <>
                        <span className="font-medium">{row.marks3}</span>
                        <span className="text-muted-foreground text-xs ml-1">({row.fullMarks3})</span>
                      </>
                    )}
                  </td>
                  <td className="p-3 text-center border-t border-border font-bold text-primary">
                    {row.total}/{row.fullTotal}
                  </td>
                  <td className="p-3 border-t border-border">
                    <div className="flex items-center justify-center">
                      <PerformanceIndicator 
                        value={row.total} 
                        maxValue={row.fullTotal} 
                        size="sm"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Result Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-xl text-center border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-1">Grand Total</span>
            <p className="text-xl md:text-2xl font-bold text-foreground">
              {summary.grandTotal}<span className="text-muted-foreground text-base font-normal">/{summary.fullMarks}</span>
            </p>
          </div>
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-xl text-center border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-1">Percentage</span>
            <p className={cn(
              "text-xl md:text-2xl font-bold flex items-center justify-center gap-1",
              getPerformanceColor(summary.percentage)
            )}>
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
              {summary.percentage.toFixed(1)}%
            </p>
          </div>
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-xl text-center border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-2">Grade</span>
            <Badge className={`text-lg px-4 py-1 ${getGradeColor(summary.grade)}`}>
              {summary.grade}
            </Badge>
          </div>
          <div className={cn(
            "p-4 rounded-xl text-center border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
            summary.isPassed 
              ? 'bg-gradient-to-br from-success/10 to-success/5 border-success/30' 
              : 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30'
          )}>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-2">Result</span>
            <Badge 
              className={cn(
                "text-base px-4 py-1 animate-pulse",
                summary.isPassed 
                  ? 'bg-success text-success-foreground' 
                  : 'bg-destructive text-destructive-foreground'
              )}
            >
              {summary.isPassed ? 'PASS ✓' : 'FAIL'}
            </Badge>
          </div>
          <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-secondary to-secondary/80 p-4 rounded-xl text-center border border-accent/30 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
            <span className="text-xs text-secondary-foreground/70 font-medium uppercase tracking-wide block mb-1">Class Rank</span>
            <p className="text-xl md:text-2xl font-bold text-secondary-foreground flex items-center justify-center gap-2">
              <Award className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              {summary.rank}
            </p>
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

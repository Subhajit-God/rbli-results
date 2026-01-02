import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Award, TrendingUp } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

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

const ResultCard = ({ examName, student, marks, summary, onDownloadPDF }: ResultCardProps) => {
  return (
    <Card className="shadow-official border-2 border-primary/10 overflow-hidden print:shadow-none print:border">
      {/* Header */}
      <CardHeader className="header-gradient text-primary-foreground p-6 print:p-4">
        <div className="flex items-center gap-4 justify-center">
          <img 
            src={schoolLogo} 
            alt="School Logo" 
            className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-primary-foreground/50"
          />
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold">Ramjibanpur Babulal Institution</h2>
            <p className="text-sm text-primary-foreground/80">Estd. 1925</p>
          </div>
        </div>
        <div className="text-center mt-4">
          <Badge className="gold-gradient text-accent-foreground border-none text-sm px-4 py-1">
            {examName}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Student Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg board-border">
          <div>
            <span className="text-xs text-muted-foreground">Student Name</span>
            <p className="font-semibold text-foreground">{student.name}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Class</span>
            <p className="font-semibold text-foreground">{student.classNumber}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Section</span>
            <p className="font-semibold text-foreground">{student.section}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Roll Number</span>
            <p className="font-semibold text-foreground">{student.rollNumber}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Student ID</span>
            <p className="font-semibold text-foreground">{student.studentId}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Father's Name</span>
            <p className="font-semibold text-foreground">{student.fatherName}</p>
          </div>
          <div className="col-span-2 md:col-span-3">
            <span className="text-xs text-muted-foreground">Mother's Name</span>
            <p className="font-semibold text-foreground">{student.motherName}</p>
          </div>
        </div>

        {/* Marks Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="header-gradient text-primary-foreground">
                <th className="border border-primary/30 p-2 text-left">Subject</th>
                <th className="border border-primary/30 p-2 text-center">I (FM)</th>
                <th className="border border-primary/30 p-2 text-center">II (FM)</th>
                <th className="border border-primary/30 p-2 text-center">III (FM)</th>
                <th className="border border-primary/30 p-2 text-center">Total</th>
                <th className="border border-primary/30 p-2 text-center">%</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((row, index) => (
                <tr 
                  key={index} 
                  className={index % 2 === 0 ? 'bg-card' : 'bg-muted/30'}
                >
                  <td className="border border-border p-2 font-medium">{row.subject}</td>
                  <td className="border border-border p-2 text-center">
                    {row.marks1} ({row.fullMarks1})
                  </td>
                  <td className="border border-border p-2 text-center">
                    {row.marks2} ({row.fullMarks2})
                  </td>
                  <td className="border border-border p-2 text-center">
                    {row.marks3} ({row.fullMarks3})
                  </td>
                  <td className="border border-border p-2 text-center font-semibold">
                    {row.total}/{row.fullTotal}
                  </td>
                  <td className="border border-border p-2 text-center font-semibold">
                    {row.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Result Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg text-center board-border">
            <span className="text-xs text-muted-foreground block">Grand Total</span>
            <p className="text-xl font-bold text-foreground">
              {summary.grandTotal}/{summary.fullMarks}
            </p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg text-center board-border">
            <span className="text-xs text-muted-foreground block">Percentage</span>
            <p className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {summary.percentage.toFixed(2)}%
            </p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg text-center board-border">
            <span className="text-xs text-muted-foreground block">Grade</span>
            <Badge className={`text-lg px-3 py-1 ${getGradeColor(summary.grade)}`}>
              {summary.grade}
            </Badge>
          </div>
          <div className={`p-4 rounded-lg text-center board-border ${
            summary.isPassed ? 'bg-success/10' : 'bg-destructive/10'
          }`}>
            <span className="text-xs text-muted-foreground block">Result</span>
            <Badge 
              className={summary.isPassed 
                ? 'bg-success text-success-foreground' 
                : 'bg-destructive text-destructive-foreground'
              }
            >
              {summary.isPassed ? 'PASS' : 'FAIL'}
            </Badge>
          </div>
          <div className="bg-secondary p-4 rounded-lg text-center board-border">
            <span className="text-xs text-muted-foreground block">Class Rank</span>
            <p className="text-xl font-bold text-secondary-foreground flex items-center justify-center gap-1">
              <Award className="h-5 w-5 text-accent" />
              {summary.rank}
            </p>
          </div>
        </div>

        {/* Download Button */}
        {onDownloadPDF && (
          <div className="flex justify-center pt-4 print:hidden">
            <Button 
              onClick={onDownloadPDF}
              className="gold-gradient text-accent-foreground hover:opacity-90"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF Result
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultCard;

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, User, BookOpen, Calendar, Trophy, TrendingUp, TrendingDown, Minus, BarChart3, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import FloatingShapes from "@/components/FloatingShapes";
import schoolLogo from "@/assets/school-logo.png";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line,
} from "recharts";

interface StudentInfo {
  id: string;
  name: string;
  student_id: string;
  class_number: number;
  section: string;
  roll_number: number;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
}

interface ExamResult {
  examId: string;
  examName: string;
  academicYear: string;
  percentage: number;
  grade: string;
  rank: number | null;
  isPassed: boolean;
  totalMarks: number;
  grandTotal: number;
}

const COLORS = [
  "hsl(200, 90%, 50%)", "hsl(150, 80%, 45%)", "hsl(45, 90%, 50%)",
  "hsl(30, 90%, 55%)", "hsl(280, 70%, 55%)", "hsl(340, 80%, 55%)",
];

const StudentProfile = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (studentId) fetchStudentData(studentId);
  }, [studentId]);

  const fetchStudentData = async (sid: string) => {
    try {
      // Fetch student
      const { data: studentData } = await supabase
        .from("students").select("*").eq("student_id", sid).maybeSingle();

      if (!studentData) { setIsLoading(false); return; }
      setStudent(studentData);

      // Fetch all ranks with exam info
      const { data: ranksData } = await supabase
        .from("ranks")
        .select("*, exams(id, name, academic_year, is_deployed)")
        .eq("student_id", studentData.id)
        .order("created_at", { ascending: true });

      if (ranksData) {
        setResults(
          (ranksData as any[])
            .filter((r) => r.exams?.is_deployed)
            .map((r) => ({
              examId: r.exam_id,
              examName: r.exams?.name || "",
              academicYear: r.exams?.academic_year || "",
              percentage: r.percentage,
              grade: r.grade,
              rank: r.rank,
              isPassed: r.is_passed,
              totalMarks: r.total_marks,
              grandTotal: 0,
            }))
        );
      }
    } catch (err) {
      console.error("Error fetching student data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = results.map((r) => ({
    name: r.examName,
    percentage: r.percentage,
    rank: r.rank,
  }));

  const bestResult = results.length > 0
    ? results.reduce((best, r) => (r.percentage > best.percentage ? r : best))
    : null;

  const latestDiff = results.length >= 2
    ? results[results.length - 1].percentage - results[results.length - 2].percentage
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 space-y-6 max-w-3xl">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="glass-effect max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Student not found</p>
            <Link to="/" className="text-primary hover:underline text-sm mt-2 inline-block">
              ← Back to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingShapes />

      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Header */}
      <header className="header-gradient text-primary-foreground py-8 px-4 shadow-official relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-64 bg-secondary rounded-full -translate-x-1/2 -translate-y-1/2 blur-xl" />
        </div>
        <div className="container mx-auto flex flex-col items-center gap-3 relative z-10">
          <img src={schoolLogo} alt="School Logo" className="w-14 h-14 rounded-full border-2 border-primary-foreground/50 shadow-lg" />
          <h1 className="text-xl md:text-2xl font-bold tracking-wide">Student Profile</h1>
          <p className="text-sm text-primary-foreground/70">Ramjibanpur Babulal Institution</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-3xl space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Student Info Card */}
        <Card className="glass-effect neon-border animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {student.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Student ID", value: student.student_id, icon: FileText },
                { label: "Class", value: `${student.class_number} - ${student.section}`, icon: BookOpen },
                { label: "Roll Number", value: student.roll_number, icon: Trophy },
                { label: "Father's Name", value: student.father_name, icon: User },
                { label: "Mother's Name", value: student.mother_name, icon: User },
                { label: "Date of Birth", value: new Date(student.date_of_birth).toLocaleDateString("en-IN"), icon: Calendar },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                    <item.icon className="h-3 w-3" />
                    {item.label}
                  </span>
                  <p className="font-semibold text-foreground text-sm">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
            <Card className="glass-effect text-center p-4">
              <p className="text-xs text-muted-foreground uppercase">Exams</p>
              <p className="text-2xl font-bold text-foreground">{results.length}</p>
            </Card>
            <Card className="glass-effect text-center p-4">
              <p className="text-xs text-muted-foreground uppercase">Best Score</p>
              <p className="text-2xl font-bold text-success">{bestResult?.percentage.toFixed(1)}%</p>
            </Card>
            <Card className="glass-effect text-center p-4">
              <p className="text-xs text-muted-foreground uppercase">Best Grade</p>
              <p className="text-2xl font-bold text-primary">{bestResult?.grade}</p>
            </Card>
            <Card className="glass-effect text-center p-4">
              <p className="text-xs text-muted-foreground uppercase">Trend</p>
              <div className="flex items-center justify-center gap-1">
                {latestDiff !== null ? (
                  <>
                    {latestDiff > 0 ? (
                      <TrendingUp className="h-5 w-5 text-success" />
                    ) : latestDiff < 0 ? (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    ) : (
                      <Minus className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={cn(
                      "text-lg font-bold",
                      latestDiff > 0 ? "text-success" : latestDiff < 0 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {latestDiff > 0 ? "+" : ""}{latestDiff.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">N/A</span>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Performance Chart */}
        {results.length > 1 && (
          <Card className="glass-effect neon-border animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Performance Across Exams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bar Chart */}
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Score"]}
                  />
                  <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Line Chart for trend */}
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Line type="monotone" dataKey="percentage" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Exam Results List */}
        <Card className="glass-effect neon-border animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Exam History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No published results found.</p>
            ) : (
              results.map((r, idx) => (
                <Link
                  key={r.examId}
                  to={`/result?sid=${student.student_id}&eid=${r.examId}`}
                  className={cn(
                    "block p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-md",
                    r.isPassed
                      ? "bg-success/5 border-success/20 hover:border-success/40"
                      : "bg-destructive/5 border-destructive/20 hover:border-destructive/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{r.examName}</p>
                      <p className="text-xs text-muted-foreground">{r.academicYear}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={cn(
                          "text-lg font-bold",
                          r.isPassed ? "text-success" : "text-destructive"
                        )}>
                          {r.percentage.toFixed(1)}%
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5">{r.grade}</Badge>
                          {r.rank && (
                            <Badge variant="secondary" className="text-[10px] px-1.5">Rank {r.rank}</Badge>
                          )}
                        </div>
                      </div>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="glass-effect border-t border-primary/20 py-6 text-center relative z-10">
        <p className="text-sm text-foreground">© {new Date().getFullYear()} Ramjibanpur Babulal Institution. All Rights Reserved.</p>
        <p className="text-xs text-muted-foreground mt-1">Excellence in Education Since 1925</p>
        <p className="text-xs text-primary mt-1 font-bold text-glow">Made With ❤️ By Subhajit Das Whose ID is 04070122000103</p>
      </footer>
    </div>
  );
};

export default StudentProfile;

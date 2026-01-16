import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Shield, ArrowLeft, Loader2, GraduationCap } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

interface VerificationData {
  student: {
    name: string;
    studentId: string;
    class: number;
    section: string;
    rollNumber: number;
    fatherName: string;
    motherName: string;
  };
  exam: {
    name: string;
    academicYear: string;
    deployedAt: string;
  };
  rank: {
    totalMarks: number;
    percentage: number;
    grade: string;
    rank: number | null;
    isPassed: boolean;
  };
}

const Verify = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationData | null>(null);

  const studentId = searchParams.get("sid");
  const examId = searchParams.get("eid");

  useEffect(() => {
    const verifyResult = async () => {
      if (!studentId || !examId) {
        setError("Invalid verification link. Missing student or exam information.");
        setLoading(false);
        return;
      }

      try {
        // Fetch student data
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("*")
          .eq("student_id", studentId)
          .maybeSingle();

        if (studentError) throw studentError;
        if (!student) {
          setError("Student record not found. This result may not be authentic.");
          setLoading(false);
          return;
        }

        // Fetch exam data (must be deployed)
        const { data: exam, error: examError } = await supabase
          .from("exams")
          .select("*")
          .eq("id", examId)
          .eq("is_deployed", true)
          .maybeSingle();

        if (examError) throw examError;
        if (!exam) {
          setError("Exam not found or not yet published. This result cannot be verified.");
          setLoading(false);
          return;
        }

        // Fetch rank data
        const { data: rank, error: rankError } = await supabase
          .from("ranks")
          .select("*")
          .eq("student_id", student.id)
          .eq("exam_id", examId)
          .maybeSingle();

        if (rankError) throw rankError;
        if (!rank) {
          setError("Result data not found for this student and exam combination.");
          setLoading(false);
          return;
        }

        setData({
          student: {
            name: student.name,
            studentId: student.student_id,
            class: student.class_number,
            section: student.section,
            rollNumber: student.roll_number,
            fatherName: student.father_name,
            motherName: student.mother_name,
          },
          exam: {
            name: exam.name,
            academicYear: exam.academic_year,
            deployedAt: exam.deployed_at || exam.updated_at,
          },
          rank: {
            totalMarks: Number(rank.total_marks),
            percentage: Number(rank.percentage),
            grade: rank.grade,
            rank: rank.rank,
            isPassed: rank.is_passed,
          },
        });
        setVerified(true);
      } catch (err) {
        console.error("Verification error:", err);
        setError("An error occurred during verification. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    verifyResult();
  }, [studentId, examId]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A+": return "bg-emerald-500";
      case "A": return "bg-green-500";
      case "B+": return "bg-blue-500";
      case "B": return "bg-sky-500";
      case "C+": return "bg-yellow-500";
      case "C": return "bg-orange-500";
      case "D": return "bg-red-500";
      default: return "bg-muted";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Verifying Result...</p>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we authenticate this result card.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Separator />
            <div className="pt-2">
              <Button asChild variant="outline">
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go to Result Portal
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verified && data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Verification Status Banner */}
          <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 rounded-full bg-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-700 dark:text-green-400">Result Verified</h2>
                <p className="text-sm text-green-600/80 dark:text-green-400/80">
                  This result card is authentic and issued by the institution.
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-500/50 ml-auto" />
            </CardContent>
          </Card>

          {/* School Header */}
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-3">
                <img src={schoolLogo} alt="School Logo" className="h-16 w-16 object-contain" />
              </div>
              <CardTitle className="text-lg">RAMJIBANPUR BABULAL INSTITUTION</CardTitle>
              <p className="text-xs text-muted-foreground">Ramjibanpur, West Bengal</p>
            </CardHeader>
          </Card>

          {/* Student & Exam Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-semibold">{data.student.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Student ID</p>
                  <p className="font-mono font-semibold">{data.student.studentId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Class & Section</p>
                  <p className="font-semibold">Class {data.student.class} - Section {data.student.section}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Roll Number</p>
                  <p className="font-semibold">{data.student.rollNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Father's Name</p>
                  <p className="font-semibold">{data.student.fatherName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mother's Name</p>
                  <p className="font-semibold">{data.student.motherName}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Examination</p>
                  <p className="font-semibold">{data.exam.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Academic Year</p>
                  <p className="font-semibold">{data.exam.academicYear}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Published On</p>
                  <p className="font-semibold">
                    {new Date(data.exam.deployedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Result Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Result Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">{data.rank.totalMarks}</p>
                  <p className="text-xs text-muted-foreground">Total Marks</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">{data.rank.percentage.toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground">Percentage</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Badge className={`${getGradeColor(data.rank.grade)} text-white text-lg px-3 py-1`}>
                    {data.rank.grade}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">Grade</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">
                    {data.rank.rank ? `#${data.rank.rank}` : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">Class Rank</p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <Badge 
                  variant={data.rank.isPassed ? "default" : "destructive"}
                  className="text-sm px-4 py-1"
                >
                  {data.rank.isPassed ? "PASSED" : "FAILED"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center space-y-2 py-4">
            <p className="text-xs text-muted-foreground">
              For detailed marks, please use the Result Portal.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to={`/?sid=${studentId}&eid=${examId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                View Full Result Card
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Verify;

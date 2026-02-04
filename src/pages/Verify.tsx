import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Shield, ArrowLeft, Loader2, GraduationCap, QrCode, Search } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import QRScanner from "@/components/QRScanner";

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationData | null>(null);
  const [activeTab, setActiveTab] = useState<string>("scan");

  const studentId = searchParams.get("sid");
  const examId = searchParams.get("eid");

  // Check if URL already has params
  const hasParams = studentId && examId;

  useEffect(() => {
    if (hasParams) {
      setActiveTab("verify");
      verifyResult(studentId, examId);
    }
  }, [studentId, examId]);

  const verifyResult = async (sid: string, eid: string) => {
    setLoading(true);
    setError(null);
    setVerified(false);
    setData(null);

    try {
      // Fetch student data
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("student_id", sid)
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
        .eq("id", eid)
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
        .eq("exam_id", eid)
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

  const handleQRScan = (decodedText: string) => {
    try {
      const url = new URL(decodedText);
      const sid = url.searchParams.get("sid");
      const eid = url.searchParams.get("eid");

      if (sid && eid) {
        // Navigate to the same page with params to trigger verification
        navigate(`/verify?sid=${encodeURIComponent(sid)}&eid=${encodeURIComponent(eid)}`);
      } else {
        setError("Invalid QR code. Missing student or exam information.");
      }
    } catch (err) {
      setError("Invalid QR code format.");
    }
  };

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

  const resetVerification = () => {
    setVerified(false);
    setError(null);
    setData(null);
    setActiveTab("scan");
    navigate("/verify");
  };

  // Loading state
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

  // Error state
  if (error && !verified) {
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
            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={resetVerification} variant="default">
                <QrCode className="mr-2 h-4 w-4" />
                Scan Another QR Code
              </Button>
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

  // Verified state
  if (verified && data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-3 sm:p-4">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          {/* Verification Status Banner */}
          <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 py-4 sm:py-6">
              <div className="p-2 sm:p-3 rounded-full bg-green-500/20">
                <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-400">Result Verified</h2>
                <p className="text-xs sm:text-sm text-green-600/80 dark:text-green-400/80">
                  This result card is authentic and issued by the institution.
                </p>
              </div>
              <Shield className="hidden sm:block h-8 w-8 text-green-500/50 ml-auto" />
            </CardContent>
          </Card>

          {/* School Header */}
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2 sm:mb-3">
                <img src={schoolLogo} alt="School Logo" className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
              </div>
              <CardTitle className="text-base sm:text-lg">RAMJIBANPUR BABULAL INSTITUTION</CardTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Ramjibanpur, West Bengal</p>
            </CardHeader>
          </Card>

          {/* Student & Exam Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Name</p>
                  <p className="font-semibold truncate">{data.student.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Student ID</p>
                  <p className="font-mono font-semibold text-[10px] sm:text-sm truncate">{data.student.studentId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Class & Section</p>
                  <p className="font-semibold">Class {data.student.class} - Section {data.student.section}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Roll Number</p>
                  <p className="font-semibold">{data.student.rollNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Father's Name</p>
                  <p className="font-semibold truncate">{data.student.fatherName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Mother's Name</p>
                  <p className="font-semibold truncate">{data.student.motherName}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Examination</p>
                  <p className="font-semibold">{data.exam.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Academic Year</p>
                  <p className="font-semibold">{data.exam.academicYear}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Published On</p>
                  <p className="font-semibold text-xs sm:text-sm">
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
              <CardTitle className="text-sm sm:text-base">Result Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="text-center p-2 sm:p-4 rounded-lg bg-muted/50">
                  <p className="text-lg sm:text-2xl font-bold text-primary">{data.rank.totalMarks}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Marks</p>
                </div>
                <div className="text-center p-2 sm:p-4 rounded-lg bg-muted/50">
                  <p className="text-lg sm:text-2xl font-bold text-primary">{data.rank.percentage.toFixed(2)}%</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Percentage</p>
                </div>
                <div className="text-center p-2 sm:p-4 rounded-lg bg-muted/50">
                  <Badge className={`${getGradeColor(data.rank.grade)} text-white text-sm sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1`}>
                    {data.rank.grade}
                  </Badge>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">Grade</p>
                </div>
                <div className="text-center p-2 sm:p-4 rounded-lg bg-muted/50">
                  <p className="text-lg sm:text-2xl font-bold text-primary">
                    {data.rank.rank ? `#${data.rank.rank}` : "N/A"}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Class Rank</p>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 text-center">
                <Badge 
                  variant={data.rank.isPassed ? "default" : "destructive"}
                  className="text-xs sm:text-sm px-3 sm:px-4 py-0.5 sm:py-1"
                >
                  {data.rank.isPassed ? "PASSED" : "FAILED"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Footer Actions */}
          <div className="text-center space-y-2 py-2 sm:py-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              For detailed marks, please use the Result Portal.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild variant="default" size="sm" className="text-xs sm:text-sm">
                <Link to={`/?sid=${studentId}&eid=${examId}`}>
                  <Search className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  View Full Result Card
                </Link>
              </Button>
              <Button onClick={resetVerification} variant="outline" size="sm" className="text-xs sm:text-sm">
                <QrCode className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Scan Another QR
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: Scanner view
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-3 sm:p-4">
      <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2 sm:mb-3">
              <img src={schoolLogo} alt="School Logo" className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
            </div>
            <CardTitle className="text-base sm:text-lg">Result Verification</CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Scan a result QR code to verify its authenticity
            </p>
          </CardHeader>
        </Card>

        {/* Tabs for Scanner */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="scan" className="gap-2 text-xs sm:text-sm">
              <QrCode className="h-4 w-4" />
              Scan QR Code
            </TabsTrigger>
          </TabsList>
          <TabsContent value="scan" className="mt-3 sm:mt-4">
            <QRScanner onScanSuccess={handleQRScan} />
          </TabsContent>
        </Tabs>

        {/* Back to Portal */}
        <div className="text-center">
          <Button asChild variant="ghost" size="sm" className="text-xs sm:text-sm">
            <Link to="/">
              <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Back to Result Portal
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Verify;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, 
  XCircle, 
  Shield, 
  Loader2, 
  GraduationCap, 
  QrCode, 
  Search,
  ExternalLink
} from "lucide-react";
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

const VerifySection = () => {
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationData | null>(null);
  const [activeTab, setActiveTab] = useState<string>("scan");
  
  // Manual lookup form
  const [studentId, setStudentId] = useState("");
  const [examId, setExamId] = useState("");
  const [exams, setExams] = useState<{ id: string; name: string; academic_year: string }[]>([]);

  // Fetch deployed exams on mount
  useEffect(() => {
    const fetchExams = async () => {
      const { data } = await supabase
        .from("exams")
        .select("id, name, academic_year")
        .eq("is_deployed", true)
        .order("created_at", { ascending: false });
      if (data) setExams(data);
    };
    fetchExams();
  }, []);

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
        setStudentId(sid);
        setExamId(eid);
        verifyResult(sid, eid);
      } else {
        setError("Invalid QR code. Missing student or exam information.");
      }
    } catch (err) {
      setError("Invalid QR code format.");
    }
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId && examId) {
      verifyResult(studentId, examId);
    } else {
      setError("Please enter both Student ID and select an Exam.");
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
    setStudentId("");
    setExamId("");
  };

  const openFullResult = () => {
    if (studentId && examId) {
      window.open(`/?sid=${encodeURIComponent(studentId)}&eid=${encodeURIComponent(examId)}`, "_blank");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground text-glow">Verify Results</h2>
        <p className="text-sm text-muted-foreground">Scan QR code or search manually to verify student results</p>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="glass-effect neon-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Verifying Result...</p>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we authenticate this result.</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && !verified && (
        <Card className="glass-effect border-destructive/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-destructive text-lg">Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button onClick={resetVerification} variant="default" size="sm">
              <QrCode className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Verified Result */}
      {verified && data && !loading && (
        <div className="space-y-4">
          {/* Verification Banner */}
          <Card className="border-green-500/50 bg-green-500/10">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-4 sm:py-6">
              <div className="p-3 rounded-full bg-green-500/20">
                <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-green-500">Result Verified</h2>
                <p className="text-xs sm:text-sm text-green-500/80">
                  This result card is authentic and issued by the institution.
                </p>
              </div>
              <Shield className="hidden sm:block h-8 w-8 text-green-500/50" />
            </CardContent>
          </Card>

          {/* Student & Result Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Student Info */}
            <Card className="glass-effect neon-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Name</p>
                    <p className="font-semibold truncate">{data.student.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Student ID</p>
                    <p className="font-mono font-semibold text-xs sm:text-sm">{data.student.studentId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Class & Section</p>
                    <p className="font-semibold">Class {data.student.class} - {data.student.section}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Roll Number</p>
                    <p className="font-semibold">{data.student.rollNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Father's Name</p>
                    <p className="font-semibold truncate">{data.student.fatherName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Mother's Name</p>
                    <p className="font-semibold truncate">{data.student.motherName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Result Summary */}
            <Card className="glass-effect neon-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Result Summary</CardTitle>
                <CardDescription className="text-xs">
                  {data.exam.name} - {data.exam.academicYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl sm:text-2xl font-bold text-primary">{data.rank.totalMarks}</p>
                    <p className="text-xs text-muted-foreground">Total Marks</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl sm:text-2xl font-bold text-primary">{data.rank.percentage.toFixed(2)}%</p>
                    <p className="text-xs text-muted-foreground">Percentage</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <Badge className={`${getGradeColor(data.rank.grade)} text-white text-base px-3 py-1`}>
                      {data.rank.grade}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">Grade</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      {data.rank.rank ? `#${data.rank.rank}` : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">Class Rank</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center items-center">
                  <Badge 
                    variant={data.rank.isPassed ? "default" : "destructive"}
                    className="text-sm px-4 py-1"
                  >
                    {data.rank.isPassed ? "PASSED" : "FAILED"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={openFullResult} className="gap-1">
                    <ExternalLink className="h-3 w-3" />
                    View Full Result
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-center">
            <Button onClick={resetVerification} variant="outline">
              <QrCode className="mr-2 h-4 w-4" />
              Verify Another Result
            </Button>
          </div>
        </div>
      )}

      {/* Scanner / Manual Lookup Tabs */}
      {!loading && !verified && !error && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="gap-2 text-xs sm:text-sm">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">Scan</span> QR Code
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2 text-xs sm:text-sm">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Manual</span> Lookup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="mt-4">
            <Card className="glass-effect neon-border">
              <CardHeader>
                <CardTitle className="text-base">QR Code Scanner</CardTitle>
                <CardDescription className="text-xs">
                  Point the camera at a result QR code to verify
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QRScanner onScanSuccess={handleQRScan} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <Card className="glass-effect neon-border">
              <CardHeader>
                <CardTitle className="text-base">Manual Lookup</CardTitle>
                <CardDescription className="text-xs">
                  Enter Student ID and select exam to verify
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualLookup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentId" className="text-sm">Student ID</Label>
                    <Input
                      id="studentId"
                      placeholder="e.g., STU2024001"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="examId" className="text-sm">Select Exam</Label>
                    <select
                      id="examId"
                      value={examId}
                      onChange={(e) => setExamId(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">-- Select an exam --</option>
                      {exams.map((exam) => (
                        <option key={exam.id} value={exam.id}>
                          {exam.name} ({exam.academic_year})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" className="w-full sm:w-auto">
                    <Search className="mr-2 h-4 w-4" />
                    Verify Result
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Instructions */}
      {!loading && !verified && !error && (
        <Card className="glass-effect border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Verification Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Scan QR codes from printed result cards to verify authenticity</li>
              <li>• Use manual lookup if QR scanning is not available</li>
              <li>• Only deployed/published results can be verified</li>
              <li>• Invalid or tampered QR codes will show an error</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VerifySection;

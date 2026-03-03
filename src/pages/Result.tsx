import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Shield } from "lucide-react";
import ResultHeader from "@/components/ResultHeader";
import ResultCard from "@/components/ResultCard";
import ResultCardPDF from "@/components/ResultCardPDF";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ResultCardSkeleton } from "@/components/ui/result-skeleton";
import FloatingShapes from "@/components/FloatingShapes";
import AIChatbot from "@/components/AIChatbot";
import ConfettiEffect from "@/components/ConfettiEffect";

interface PdfAsset {
  asset_type: string;
  file_url: string;
}

interface ResultData {
  student: {
    id: string;
    name: string;
    classNumber: number;
    section: string;
    rollNumber: number;
    studentId: string;
    fatherName: string;
    motherName: string;
  };
  examName: string;
  examId: string;
  marks: Array<{
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
  }>;
  summary: {
    grandTotal: number;
    fullMarks: number;
    percentage: number;
    grade: string;
    isPassed: boolean;
    rank: number;
  };
}

const Result = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [pdfAssets, setPdfAssets] = useState<{ signature: string | null; stamp: string | null }>({
    signature: null,
    stamp: null,
  });
  const { toast } = useToast();

  const sidParam = searchParams.get("sid");
  const eidParam = searchParams.get("eid");

  // Fetch PDF assets
  useEffect(() => {
    const fetchPdfAssets = async () => {
      try {
        const { data } = await supabase.from("pdf_assets").select("asset_type, file_url");
        const assets = { signature: null as string | null, stamp: null as string | null };
        data?.forEach((asset: PdfAsset) => {
          if (asset.asset_type === "headmaster_signature") assets.signature = asset.file_url;
          else if (asset.asset_type === "school_stamp") assets.stamp = asset.file_url;
        });
        setPdfAssets(assets);
      } catch (err) {
        console.error("Error fetching PDF assets:", err);
      }
    };
    fetchPdfAssets();
  }, []);

  const fetchResult = useCallback(async (studentId: string, examId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: student } = await supabase
        .from("students").select("*").eq("student_id", studentId).maybeSingle();
      if (!student) { setError("Student not found."); setIsLoading(false); return; }

      const { data: exam } = await supabase
        .from("exams").select("*").eq("id", examId).eq("is_deployed", true).maybeSingle();
      if (!exam) { setError("Exam not found or not published."); setIsLoading(false); return; }

      const { data: marksData } = await supabase
        .from("marks").select("*, subjects:subject_id (*)").eq("student_id", student.id).eq("exam_id", exam.id);

      const { data: rankData } = await supabase
        .from("ranks").select("*").eq("student_id", student.id).eq("exam_id", exam.id).maybeSingle();

      const formattedMarks = (marksData || []).map((mark: any) => {
        const subject = mark.subjects;
        const m1 = mark.marks_1 === "AB" || mark.marks_1 === "EX" ? 0 : parseFloat(mark.marks_1 || "0");
        const m2 = mark.marks_2 === "AB" || mark.marks_2 === "EX" ? 0 : parseFloat(mark.marks_2 || "0");
        const m3 = mark.marks_3 === "AB" || mark.marks_3 === "EX" ? 0 : parseFloat(mark.marks_3 || "0");
        const total = m1 + m2 + m3;
        const fullTotal = subject.full_marks_1 + subject.full_marks_2 + subject.full_marks_3;
        return {
          subject: subject.name, marks1: mark.marks_1 || "-", fullMarks1: subject.full_marks_1,
          marks2: mark.marks_2 || "-", fullMarks2: subject.full_marks_2,
          marks3: mark.marks_3 || "-", fullMarks3: subject.full_marks_3,
          total, fullTotal, percentage: fullTotal > 0 ? (total / fullTotal) * 100 : 0,
        };
      });

      setResultData({
        student: {
          id: student.id, name: student.name, classNumber: student.class_number,
          section: student.section, rollNumber: student.roll_number, studentId: student.student_id,
          fatherName: student.father_name, motherName: student.mother_name,
        },
        examName: exam.name, examId: exam.id,
        marks: formattedMarks,
        summary: {
          grandTotal: rankData?.total_marks || 0,
          fullMarks: formattedMarks.reduce((sum: number, m: any) => sum + m.fullTotal, 0),
          percentage: rankData?.percentage || 0, grade: rankData?.grade || "D",
          isPassed: rankData?.is_passed || false, rank: rankData?.rank || 0,
        },
      });
    } catch (err) {
      console.error("Error fetching result:", err);
      setError("An error occurred while fetching the result.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sidParam && eidParam) {
      fetchResult(sidParam, eidParam);
    } else {
      setError("Missing student ID or exam ID in URL.");
      setIsLoading(false);
    }
  }, [sidParam, eidParam, fetchResult]);

  const handleDownloadPDF = () => window.print();

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <FloatingShapes />

      {resultData && resultData.summary.isPassed && (
        <ConfettiEffect trigger={true} percentage={resultData.summary.percentage} />
      )}

      {resultData && (
        <div id="result-pdf-container" className="hidden print:block">
          <ResultCardPDF
            examName={resultData.examName} examId={resultData.examId}
            student={resultData.student} marks={resultData.marks} summary={resultData.summary}
            headmasterSignatureUrl={pdfAssets.signature} schoolStampUrl={pdfAssets.stamp}
          />
        </div>
      )}

      <header className="print:hidden relative z-10">
        <ResultHeader />
      </header>

      <div className="fixed top-4 right-4 z-50 print:hidden">
        <ThemeToggle />
      </div>

      <main className="flex-1 container mx-auto px-4 py-10 print:hidden relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Search
            </Link>
            {resultData?.student && (
              <Link
                to={`/student/${resultData.student.studentId}`}
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                View Full Profile →
              </Link>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="neon-border">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <ResultCardSkeleton />
          ) : resultData ? (
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <ResultCard
                examName={resultData.examName} examId={resultData.examId}
                student={resultData.student} marks={resultData.marks}
                summary={resultData.summary} onDownloadPDF={handleDownloadPDF}
              />
            </div>
          ) : null}
        </div>
      </main>

      <div className="fixed bottom-4 left-4 print:hidden z-50">
        <Link
          to="/admin/auth"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-all duration-200 glass-effect px-4 py-2.5 rounded-full border border-primary/30 shadow-md hover:neon-glow hover:border-primary/50 hover:scale-105"
        >
          <Shield className="h-3.5 w-3.5" />
          Admin Login
        </Link>
      </div>

      {resultData && (
        <AIChatbot
          studentData={{
            name: resultData.student.name, classNumber: resultData.student.classNumber,
            section: resultData.student.section, rollNumber: resultData.student.rollNumber,
            examName: resultData.examName,
            marks: resultData.marks.map((m) => ({
              subject: m.subject, total: m.total, fullTotal: m.fullTotal, percentage: m.percentage,
            })),
            summary: resultData.summary,
          }}
        />
      )}

      <footer className="glass-effect border-t border-primary/20 py-6 text-center print:hidden relative z-10">
        <p className="text-sm text-foreground">© {new Date().getFullYear()} Ramjibanpur Babulal Institution. All Rights Reserved.</p>
        <p className="text-xs text-muted-foreground mt-1">Excellence in Education Since 1925</p>
        <p className="text-xs text-primary mt-1 font-bold text-glow">Made With ❤️ By Subhajit Das Whose ID is 04070122000103</p>
      </footer>
    </div>
  );
};

export default Result;

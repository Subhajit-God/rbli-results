import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Shield } from "lucide-react";
import ResultHeader from "@/components/ResultHeader";
import ResultLookupForm from "@/components/ResultLookupForm";
import ResultCard from "@/components/ResultCard";
import ResultCardPDF from "@/components/ResultCardPDF";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ResultFormSkeleton, ResultCardSkeleton } from "@/components/ui/result-skeleton";
import FloatingShapes from "@/components/FloatingShapes";
import AIChatbot from "@/components/AIChatbot";

interface PdfAsset {
  asset_type: string;
  file_url: string;
}

interface ResultData {
  student: {
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

const Index = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [autoLookupAttempted, setAutoLookupAttempted] = useState(false);
  const [pdfAssets, setPdfAssets] = useState<{ signature: string | null; stamp: string | null }>({
    signature: null,
    stamp: null,
  });
  const { toast } = useToast();

  // Get URL params for auto-lookup
  const sidParam = searchParams.get("sid");
  const eidParam = searchParams.get("eid");

  // Simulate initial page load
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Fetch PDF assets (signature and stamp)
  useEffect(() => {
    const fetchPdfAssets = async () => {
      try {
        const { data, error } = await supabase
          .from("pdf_assets")
          .select("asset_type, file_url");

        if (error) throw error;

        const assets = { signature: null as string | null, stamp: null as string | null };
        data?.forEach((asset: PdfAsset) => {
          if (asset.asset_type === "headmaster_signature") {
            assets.signature = asset.file_url;
          } else if (asset.asset_type === "school_stamp") {
            assets.stamp = asset.file_url;
          }
        });
        setPdfAssets(assets);
      } catch (error) {
        console.error("Error fetching PDF assets:", error);
      }
    };

    fetchPdfAssets();
  }, []);

  // Fetch result by student ID and exam ID (for URL params / QR code)
  const fetchResultByIds = useCallback(async (studentId: string, examId: string) => {
    setIsLoading(true);
    setError(null);
    setResultData(null);

    try {
      // Find student by student_id
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      if (studentError) throw studentError;

      if (!student) {
        setError("Student not found. Please check the Student ID.");
        setIsLoading(false);
        return;
      }

      // Check if the exam is deployed
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .eq('is_deployed', true)
        .maybeSingle();

      if (examError) throw examError;

      if (!exam) {
        setError("Exam not found or result not published yet.");
        setIsLoading(false);
        return;
      }

      // Get marks for this student and exam
      const { data: marksData, error: marksError } = await supabase
        .from('marks')
        .select(`
          *,
          subjects:subject_id (*)
        `)
        .eq('student_id', student.id)
        .eq('exam_id', exam.id);

      if (marksError) throw marksError;

      // Get rank
      const { data: rankData, error: rankError } = await supabase
        .from('ranks')
        .select('*')
        .eq('student_id', student.id)
        .eq('exam_id', exam.id)
        .single();

      if (rankError && rankError.code !== 'PGRST116') throw rankError;

      // Format marks for display
      const formattedMarks = (marksData || []).map((mark: any) => {
        const subject = mark.subjects;
        const m1 = mark.marks_1 === 'AB' || mark.marks_1 === 'EX' ? 0 : parseFloat(mark.marks_1 || '0');
        const m2 = mark.marks_2 === 'AB' || mark.marks_2 === 'EX' ? 0 : parseFloat(mark.marks_2 || '0');
        const m3 = mark.marks_3 === 'AB' || mark.marks_3 === 'EX' ? 0 : parseFloat(mark.marks_3 || '0');
        const total = m1 + m2 + m3;
        const fullTotal = subject.full_marks_1 + subject.full_marks_2 + subject.full_marks_3;
        
        return {
          subject: subject.name,
          marks1: mark.marks_1 || '-',
          fullMarks1: subject.full_marks_1,
          marks2: mark.marks_2 || '-',
          fullMarks2: subject.full_marks_2,
          marks3: mark.marks_3 || '-',
          fullMarks3: subject.full_marks_3,
          total,
          fullTotal,
          percentage: fullTotal > 0 ? (total / fullTotal) * 100 : 0,
        };
      });

      setResultData({
        student: {
          name: student.name,
          classNumber: student.class_number,
          section: student.section,
          rollNumber: student.roll_number,
          studentId: student.student_id,
          fatherName: student.father_name,
          motherName: student.mother_name,
        },
        examName: exam.name,
        examId: exam.id,
        marks: formattedMarks,
        summary: {
          grandTotal: rankData?.total_marks || 0,
          fullMarks: formattedMarks.reduce((sum, m) => sum + m.fullTotal, 0),
          percentage: rankData?.percentage || 0,
          grade: rankData?.grade || 'D',
          isPassed: rankData?.is_passed || false,
          rank: rankData?.rank || 0,
        },
      });

    } catch (err: any) {
      console.error('Error fetching result:', err);
      setError("An error occurred while fetching the result. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-lookup when URL has sid and eid params
  useEffect(() => {
    if (sidParam && eidParam && !autoLookupAttempted && !isInitialLoading) {
      setAutoLookupAttempted(true);
      fetchResultByIds(sidParam, eidParam);
    }
  }, [sidParam, eidParam, autoLookupAttempted, isInitialLoading, fetchResultByIds]);

  const handleLookup = async (data: { studentId: string; classNumber: string; dob: Date }) => {
    setIsLoading(true);
    setError(null);
    setResultData(null);

    try {
      // Check if any exam is deployed
      const { data: deployedExams, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('is_deployed', true)
        .limit(1);

      if (examError) throw examError;

      if (!deployedExams || deployedExams.length === 0) {
        setError("Result not published yet.");
        setIsLoading(false);
        return;
      }

      // Find student matching all criteria
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', data.studentId)
        .eq('class_number', parseInt(data.classNumber))
        .eq('date_of_birth', format(data.dob, 'yyyy-MM-dd'));

      if (studentError) throw studentError;

      if (!students || students.length === 0) {
        setError("Invalid details. Please check and try again.");
        setIsLoading(false);
        return;
      }

      const student = students[0];
      const exam = deployedExams[0];

      // Get marks for this student and exam
      const { data: marksData, error: marksError } = await supabase
        .from('marks')
        .select(`
          *,
          subjects:subject_id (*)
        `)
        .eq('student_id', student.id)
        .eq('exam_id', exam.id);

      if (marksError) throw marksError;

      // Get rank
      const { data: rankData, error: rankError } = await supabase
        .from('ranks')
        .select('*')
        .eq('student_id', student.id)
        .eq('exam_id', exam.id)
        .single();

      if (rankError && rankError.code !== 'PGRST116') throw rankError;

      // Format marks for display
      const formattedMarks = (marksData || []).map((mark: any) => {
        const subject = mark.subjects;
        const m1 = mark.marks_1 === 'AB' || mark.marks_1 === 'EX' ? 0 : parseFloat(mark.marks_1 || '0');
        const m2 = mark.marks_2 === 'AB' || mark.marks_2 === 'EX' ? 0 : parseFloat(mark.marks_2 || '0');
        const m3 = mark.marks_3 === 'AB' || mark.marks_3 === 'EX' ? 0 : parseFloat(mark.marks_3 || '0');
        const total = m1 + m2 + m3;
        const fullTotal = subject.full_marks_1 + subject.full_marks_2 + subject.full_marks_3;
        
        return {
          subject: subject.name,
          marks1: mark.marks_1 || '-',
          fullMarks1: subject.full_marks_1,
          marks2: mark.marks_2 || '-',
          fullMarks2: subject.full_marks_2,
          marks3: mark.marks_3 || '-',
          fullMarks3: subject.full_marks_3,
          total,
          fullTotal,
          percentage: fullTotal > 0 ? (total / fullTotal) * 100 : 0,
        };
      });

      setResultData({
        student: {
          name: student.name,
          classNumber: student.class_number,
          section: student.section,
          rollNumber: student.roll_number,
          studentId: student.student_id,
          fatherName: student.father_name,
          motherName: student.mother_name,
        },
        examName: exam.name,
        examId: exam.id,
        marks: formattedMarks,
        summary: {
          grandTotal: rankData?.total_marks || 0,
          fullMarks: formattedMarks.reduce((sum, m) => sum + m.fullTotal, 0),
          percentage: rankData?.percentage || 0,
          grade: rankData?.grade || 'D',
          isPassed: rankData?.is_passed || false,
          rank: rankData?.rank || 0,
        },
      });

    } catch (err: any) {
      console.error('Error fetching result:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while fetching the result. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300 relative overflow-hidden">
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-link"
      >
        Skip to main content
      </a>

      {/* Futuristic Background */}
      <FloatingShapes />
      
      {/* PDF Version - Hidden on screen, shown on print */}
      {resultData && (
        <div id="result-pdf-container" className="hidden print:block">
          <ResultCardPDF
            examName={resultData.examName}
            examId={resultData.examId}
            student={resultData.student}
            marks={resultData.marks}
            summary={resultData.summary}
            headmasterSignatureUrl={pdfAssets.signature}
            schoolStampUrl={pdfAssets.stamp}
          />
        </div>
      )}


      <header className="print:hidden relative z-10">
        <ResultHeader />
      </header>
      
      {/* Theme Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <ThemeToggle />
      </div>
      
      <main id="main-content" className="flex-1 container mx-auto px-4 py-10 md:py-16 print:hidden relative z-10" role="main">
        {isInitialLoading ? (
          <div className="max-w-md mx-auto animate-fade-in">
            <ResultFormSkeleton />
          </div>
        ) : !resultData ? (
          <div className="max-w-md mx-auto animate-fade-in">
            <Card className="glass-effect neon-border overflow-hidden transition-all duration-300 hover:shadow-official animate-glow">
              <div className="h-1.5 cyber-gradient" />
              <CardHeader className="text-center space-y-3 pb-2">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/20 neon-glow flex items-center justify-center mb-2 transition-transform hover:scale-110 duration-300">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-2xl md:text-3xl text-foreground font-bold text-glow">
                  Check Your Result
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Enter your details below to view your Summative Evaluation result
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-8 px-6 md:px-8">
                {error && (
                  <Alert variant="destructive" className="mb-6 animate-fade-in neon-border">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <ResultLookupForm onSubmit={handleLookup} isLoading={isLoading} />
              </CardContent>
            </Card>
            
            {/* Help text */}
            <p className="text-center text-sm text-muted-foreground mt-6 animate-fade-in">
              Having trouble? Contact the school office for assistance.
            </p>
          </div>
        ) : isLoading ? (
          <div className="max-w-4xl mx-auto">
            <ResultCardSkeleton />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <button 
              onClick={() => setResultData(null)}
              className="text-primary hover:text-primary/80 text-sm print:hidden flex items-center gap-1 transition-all duration-200 font-medium hover:translate-x-[-4px]"
            >
              ← Back to Search
            </button>
            <ResultCard 
              examName={resultData.examName}
              student={resultData.student}
              marks={resultData.marks}
              summary={resultData.summary}
              onDownloadPDF={handleDownloadPDF}
            />
          </div>
        )}
      </main>

      {/* Admin Login Button - Bottom Left */}
      <div className="fixed bottom-4 left-4 print:hidden z-50">
        <Link 
          to="/admin/auth"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-all duration-200 glass-effect px-4 py-2.5 rounded-full border border-primary/30 shadow-md hover:neon-glow hover:border-primary/50 hover:scale-105"
        >
          <Shield className="h-3.5 w-3.5" />
          Admin Login
        </Link>
      </div>

      {/* AI Chatbot */}
      <AIChatbot 
        studentData={resultData ? {
          name: resultData.student.name,
          classNumber: resultData.student.classNumber,
          section: resultData.student.section,
          rollNumber: resultData.student.rollNumber,
          examName: resultData.examName,
          marks: resultData.marks.map(m => ({
            subject: m.subject,
            total: m.total,
            fullTotal: m.fullTotal,
            percentage: m.percentage,
          })),
          summary: resultData.summary,
        } : undefined}
      />

      {/* Footer */}
      <footer className="glass-effect border-t border-primary/20 py-6 text-center print:hidden transition-colors duration-300 relative z-10">
        <p className="text-sm text-foreground">
          © {new Date().getFullYear()} Ramjibanpur Babulal Institution. All Rights Reserved.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Excellence in Education Since 1925
        </p>
        <p className="text-xs text-primary mt-1 font-bold text-glow">
          Made With ❤️ By Subhajit Das Whose ID is 04070122000103
        </p>
      </footer>
    </div>
  );
};

export default Index;

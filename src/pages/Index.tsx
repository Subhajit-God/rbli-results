import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Shield } from "lucide-react";
import ResultHeader from "@/components/ResultHeader";
import ResultLookupForm from "@/components/ResultLookupForm";
import ResultCard from "@/components/ResultCard";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const { toast } = useToast();

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
    <div className="min-h-screen bg-background flex flex-col">
      <ResultHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {!resultData ? (
          <div className="max-w-md mx-auto">
            <Card className="shadow-card border-primary/10">
              <CardHeader className="text-center space-y-2">
                <CardTitle className="text-2xl text-foreground">
                  Check Your Result
                </CardTitle>
                <CardDescription>
                  Enter your details below to view your examination result
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <ResultLookupForm onSubmit={handleLookup} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <button 
              onClick={() => setResultData(null)}
              className="text-primary hover:underline text-sm print:hidden"
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
      <div className="fixed bottom-4 left-4 print:hidden">
        <Link 
          to="/admin/auth"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors bg-card/80 backdrop-blur-sm px-3 py-2 rounded-md border border-border shadow-sm"
        >
          <Shield className="h-3 w-3" />
          Admin Login / Register
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-muted/50 border-t border-border py-4 text-center text-sm text-muted-foreground print:hidden">
        <p>© {new Date().getFullYear()} Ramjibanpur Babulal Institution. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Index;

import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Shield, Trophy } from "lucide-react";
import ResultHeader from "@/components/ResultHeader";
import ResultLookupForm from "@/components/ResultLookupForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ResultFormSkeleton } from "@/components/ui/result-skeleton";
import FloatingShapes from "@/components/FloatingShapes";
import AIChatbot from "@/components/AIChatbot";
import TypewriterText from "@/components/TypewriterText";


const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // If URL has sid and eid, redirect to /result page
  const sidParam = searchParams.get("sid");
  const eidParam = searchParams.get("eid");

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (sidParam && eidParam && !isInitialLoading) {
      navigate(`/result?sid=${sidParam}&eid=${eidParam}`, { replace: true });
    }
  }, [sidParam, eidParam, isInitialLoading, navigate]);

  const handleLookup = async (data: { studentId: string; classNumber: string; dob: Date }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if any exam is deployed
      const { data: deployedExams, error: examError } = await supabase
        .from("exams")
        .select("id")
        .eq("is_deployed", true)
        .limit(1);

      if (examError) throw examError;

      if (!deployedExams || deployedExams.length === 0) {
        setError("Result not published yet.");
        setIsLoading(false);
        return;
      }

      // Find student matching criteria
      const { data: students, error: studentError } = await supabase
        .from("students")
        .select("student_id")
        .eq("student_id", data.studentId)
        .eq("class_number", parseInt(data.classNumber))
        .eq("date_of_birth", format(data.dob, "yyyy-MM-dd"));

      if (studentError) throw studentError;

      if (!students || students.length === 0) {
        setError("Invalid details. Please check and try again.");
        setIsLoading(false);
        return;
      }

      // Navigate to result page
      navigate(`/result?sid=${students[0].student_id}&eid=${deployedExams[0].id}`);
    } catch (err: any) {
      console.error("Error:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300 relative overflow-hidden">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <FloatingShapes />

      <header className="print:hidden relative z-10">
        <ResultHeader />
      </header>

      <div className="fixed top-4 right-4 z-50 print:hidden">
        <ThemeToggle />
      </div>

      <main id="main-content" className="flex-1 container mx-auto px-4 py-10 md:py-16 print:hidden relative z-10" role="main">
        {isInitialLoading ? (
          <div className="max-w-md mx-auto animate-fade-in">
            <ResultFormSkeleton />
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-6">
            {/* Hero text with typewriter */}
            <div className="text-center mb-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                <TypewriterText text="Welcome to RBI Results" speed={60} />
              </h2>
              <p className="text-muted-foreground animate-in fade-in-0 duration-1000 delay-1000 fill-mode-both">
                Check your Summative Evaluation results instantly
              </p>
            </div>

            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
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
            </div>

            {/* Quick links */}
            <div className="flex justify-center gap-4 animate-in fade-in-0 duration-700 delay-700 fill-mode-both">
              <Link
                to="/leaderboard"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all duration-200 glass-effect px-4 py-2.5 rounded-full border border-primary/30 shadow-md hover:neon-glow hover:border-primary/50 hover:scale-105"
              >
                <Trophy className="h-3.5 w-3.5" />
                View Leaderboard
              </Link>
            </div>

            <p className="text-center text-sm text-muted-foreground animate-fade-in">
              Having trouble? Contact the school office for assistance.
            </p>
          </div>
        )}
      </main>

      {/* Admin Login Button */}
      <div className="fixed bottom-4 left-4 print:hidden z-50">
        <Link
          to="/admin/auth"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-all duration-200 glass-effect px-4 py-2.5 rounded-full border border-primary/30 shadow-md hover:neon-glow hover:border-primary/50 hover:scale-105"
        >
          <Shield className="h-3.5 w-3.5" />
          Admin Login
        </Link>
      </div>

      <AIChatbot />

      {/* Footer */}
      <footer className="glass-effect border-t border-primary/20 py-6 text-center print:hidden transition-colors duration-300 relative z-10">
        <p className="text-sm text-foreground">
          © {new Date().getFullYear()} Ramjibanpur Babulal Institution. All Rights Reserved.
        </p>
        <p className="text-xs text-muted-foreground mt-1">Excellence in Education Since 1925</p>
        <p className="text-xs text-primary mt-1 font-bold text-glow">
          Made With ❤️ By Subhajit Das Whose ID is 04070122000103
        </p>
      </footer>
    </div>
  );
};

export default Index;

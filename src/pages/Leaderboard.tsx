import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Crown, Medal, Star, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import FloatingShapes from "@/components/FloatingShapes";
import schoolLogo from "@/assets/school-logo.png";

interface TopStudent {
  student_id: string;
  percentage: number;
  grade: string;
  rank: number | null;
  students: { name: string; class_number: number; roll_number: number; section: string } | null;
}

const MEDAL_CONFIG = [
  { icon: Crown, label: "1st", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30", glow: "shadow-[0_0_20px_hsl(45,90%,50%,0.3)]" },
  { icon: Medal, label: "2nd", color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/30", glow: "shadow-[0_0_15px_hsl(200,10%,70%,0.2)]" },
  { icon: Medal, label: "3rd", color: "text-amber-700", bg: "bg-amber-700/10 border-amber-700/30", glow: "shadow-[0_0_15px_hsl(30,70%,40%,0.2)]" },
];

const Leaderboard = () => {
  const [topPerformers, setTopPerformers] = useState<Record<number, TopStudent[]>>({});
  const [examName, setExamName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Get the deployed exam
      const { data: exam } = await supabase
        .from("exams")
        .select("id, name, academic_year")
        .eq("is_deployed", true)
        .limit(1)
        .maybeSingle();

      if (!exam) {
        setIsLoading(false);
        return;
      }

      setExamName(`${exam.name} (${exam.academic_year})`);

      const { data } = await supabase
        .from("ranks")
        .select("student_id, percentage, grade, rank, students(name, class_number, roll_number, section)")
        .eq("exam_id", exam.id)
        .eq("is_passed", true)
        .order("percentage", { ascending: false });

      const grouped: Record<number, TopStudent[]> = {};
      ((data || []) as unknown as TopStudent[]).forEach((r) => {
        const cn = r.students?.class_number;
        if (cn) {
          if (!grouped[cn]) grouped[cn] = [];
          if (grouped[cn].length < 3) grouped[cn].push(r);
        }
      });
      setTopPerformers(grouped);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedClasses = Object.keys(topPerformers).map(Number).sort((a, b) => a - b);

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
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-warning rounded-full translate-x-1/2 translate-y-1/2 blur-xl" />
        </div>
        <div className="container mx-auto flex flex-col items-center gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <img src={schoolLogo} alt="School Logo" className="w-16 h-16 rounded-full border-2 border-primary-foreground/50 shadow-lg" />
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold tracking-wide">Top Performers</h1>
              <p className="text-sm text-primary-foreground/70">Ramjibanpur Babulal Institution</p>
            </div>
          </div>
          {examName && (
            <Badge className="gold-gradient text-accent-foreground border-none px-6 py-1.5 shadow-md text-sm">
              {examName}
            </Badge>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Results
        </Link>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[280px]" />
            ))}
          </div>
        ) : sortedClasses.length === 0 ? (
          <Card className="glass-effect max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No results published yet</p>
              <p className="text-sm text-muted-foreground mt-1">Check back after results are deployed.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedClasses.map((classNum, classIdx) => (
              <Card
                key={classNum}
                className="glass-effect neon-border overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${classIdx * 100}ms` }}
              >
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Class {classNum}
                    </span>
                    <Badge variant="secondary" className="text-xs">Top 3</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {topPerformers[classNum].map((student, idx) => {
                    const medal = MEDAL_CONFIG[idx];
                    const MedalIcon = medal.icon;
                    return (
                      <div
                        key={student.student_id}
                        className={cn(
                          "relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
                          "hover:scale-[1.02] hover:shadow-lg",
                          medal.bg, medal.glow,
                          "animate-in fade-in-0 slide-in-from-left-4 duration-500"
                        )}
                        style={{ animationDelay: `${classIdx * 100 + idx * 150}ms` }}
                      >
                        <div className="flex-shrink-0 relative">
                          <MedalIcon className={cn("h-8 w-8", medal.color)} />
                          {idx === 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {student.students?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Roll {student.students?.roll_number} • Section {student.students?.section}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("text-lg font-bold", medal.color)}>
                            {student.percentage.toFixed(1)}%
                          </p>
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {student.grade}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="glass-effect border-t border-primary/20 py-6 text-center relative z-10">
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

export default Leaderboard;

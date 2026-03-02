import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Crown, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopStudent {
  student_id: string;
  percentage: number;
  total_marks: number;
  grade: string;
  rank: number | null;
  students: { name: string; class_number: number; roll_number: number; section: string } | null;
}

const MEDAL_CONFIG = [
  { icon: Crown, label: "1st", colorClass: "text-yellow-500", bgClass: "bg-yellow-500/10 border-yellow-500/30", glowClass: "shadow-[0_0_20px_hsl(45,90%,50%,0.3)]" },
  { icon: Medal, label: "2nd", colorClass: "text-slate-400", bgClass: "bg-slate-400/10 border-slate-400/30", glowClass: "shadow-[0_0_15px_hsl(200,10%,70%,0.2)]" },
  { icon: Medal, label: "3rd", colorClass: "text-amber-700", bgClass: "bg-amber-700/10 border-amber-700/30", glowClass: "shadow-[0_0_15px_hsl(30,70%,40%,0.2)]" },
];

const TopPerformersLeaderboard = () => {
  const [examOptions, setExamOptions] = useState<{ id: string; name: string; academic_year: string }[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [topPerformers, setTopPerformers] = useState<Record<number, TopStudent[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) fetchTopPerformers();
  }, [selectedExam]);

  const fetchExams = async () => {
    const { data } = await supabase
      .from("exams")
      .select("id, name, academic_year")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setExamOptions(data);
      const deployed = data.find((e: any) => e.is_deployed) || data[0];
      setSelectedExam(deployed?.id || data[0].id);
    }
    setIsLoading(false);
  };

  const fetchTopPerformers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ranks")
        .select("student_id, percentage, total_marks, grade, rank, students(name, class_number, roll_number, section)")
        .eq("exam_id", selectedExam)
        .order("percentage", { ascending: false });

      if (error) throw error;

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
      console.error("Error fetching top performers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && examOptions.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[280px]" />
          ))}
        </div>
      </div>
    );
  }

  if (examOptions.length === 0) {
    return (
      <Card className="glass-effect">
        <CardContent className="py-12 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No exam data available</p>
          <p className="text-sm text-muted-foreground mt-1">Create an academic year and finalize ranks to see the leaderboard.</p>
        </CardContent>
      </Card>
    );
  }

  const sortedClasses = Object.keys(topPerformers)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <Trophy className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Top Performers</h2>
            <p className="text-sm text-muted-foreground">Class-wise top 3 students by percentage</p>
          </div>
        </div>
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Select exam" />
          </SelectTrigger>
          <SelectContent>
            {examOptions.map((exam) => (
              <SelectItem key={exam.id} value={exam.id}>
                {exam.name} ({exam.academic_year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[280px]" />
          ))}
        </div>
      ) : sortedClasses.length === 0 ? (
        <Card className="glass-effect">
          <CardContent className="py-12 text-center">
            <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No rank data found for this exam.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedClasses.map((classNum, classIdx) => (
            <Card
              key={classNum}
              className="glass-effect neon-border overflow-hidden animate-fade-in"
              style={{ animationDelay: `${classIdx * 100}ms` }}
            >
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Class {classNum}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    Top 3
                  </Badge>
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
                        medal.bgClass,
                        medal.glowClass,
                        "animate-scale-in"
                      )}
                      style={{ animationDelay: `${classIdx * 100 + idx * 150}ms` }}
                    >
                      {/* Medal */}
                      <div className={cn("flex-shrink-0 relative")}>
                        <MedalIcon className={cn("h-8 w-8", medal.colorClass)} />
                        {idx === 0 && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
                          </span>
                        )}
                      </div>

                      {/* Student Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {student.students?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Roll {student.students?.roll_number} • Section {student.students?.section}
                        </p>
                      </div>

                      {/* Score */}
                      <div className="text-right flex-shrink-0">
                        <p className={cn("text-lg font-bold", medal.colorClass)}>
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
    </div>
  );
};

export default TopPerformersLeaderboard;

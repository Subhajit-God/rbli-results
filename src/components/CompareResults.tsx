import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface CompareResultsProps {
  studentDbId: string;
  studentName: string;
  currentExamId: string;
}

interface ExamResult {
  examName: string;
  percentage: number;
  grade: string;
  rank: number | null;
  isPassed: boolean;
  totalMarks: number;
}

const CompareResults = ({ studentDbId, studentName, currentExamId }: CompareResultsProps) => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllResults();
  }, [studentDbId]);

  const fetchAllResults = async () => {
    try {
      const { data } = await supabase
        .from("ranks")
        .select("percentage, grade, rank, is_passed, total_marks, exam_id, exams(name, academic_year)")
        .eq("student_id", studentDbId)
        .order("created_at", { ascending: true });

      if (data) {
        setResults(
          (data as any[]).map((r) => ({
            examName: `${r.exams?.name}`,
            percentage: r.percentage,
            grade: r.grade,
            rank: r.rank,
            isPassed: r.is_passed,
            totalMarks: r.total_marks,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching comparison data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <Skeleton className="h-[200px]" />;
  if (results.length <= 1) return null;

  const latest = results[results.length - 1];
  const previous = results[results.length - 2];
  const diff = latest.percentage - previous.percentage;

  const chartData = results.map((r) => ({
    name: r.examName,
    percentage: r.percentage,
  }));

  const COLORS = [
    "hsl(200, 90%, 50%)",
    "hsl(150, 80%, 45%)",
    "hsl(45, 90%, 50%)",
    "hsl(30, 90%, 55%)",
    "hsl(280, 70%, 55%)",
  ];

  return (
    <Card className="glass-effect neon-border print:hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Performance Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trend indicator */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
          {diff > 0 ? (
            <TrendingUp className="h-5 w-5 text-success" />
          ) : diff < 0 ? (
            <TrendingDown className="h-5 w-5 text-destructive" />
          ) : (
            <Minus className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {diff > 0
                ? `Improved by ${diff.toFixed(1)}%`
                : diff < 0
                ? `Decreased by ${Math.abs(diff).toFixed(1)}%`
                : "No change"}
            </p>
            <p className="text-xs text-muted-foreground">
              Compared to previous exam
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "ml-auto",
              diff > 0
                ? "border-success/50 text-success"
                : diff < 0
                ? "border-destructive/50 text-destructive"
                : ""
            )}
          >
            {diff > 0 ? "+" : ""}
            {diff.toFixed(1)}%
          </Badge>
        </div>

        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={180}>
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
      </CardContent>
    </Card>
  );
};

export default CompareResults;

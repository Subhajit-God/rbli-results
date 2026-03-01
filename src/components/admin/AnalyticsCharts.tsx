import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, PieChart as PieIcon, TrendingUp, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

interface RankData {
  grade: string;
  percentage: number;
  is_passed: boolean;
  student_id: string;
  students?: { class_number: number; name: string } | null;
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "hsl(150, 80%, 45%)",
  "A": "hsl(150, 70%, 50%)",
  "B+": "hsl(200, 90%, 50%)",
  "B": "hsl(200, 80%, 55%)",
  "C+": "hsl(45, 90%, 50%)",
  "C": "hsl(30, 90%, 55%)",
  "D": "hsl(0, 70%, 50%)",
};

const CHART_COLORS = [
  "hsl(200, 90%, 50%)",
  "hsl(150, 80%, 45%)",
  "hsl(45, 90%, 50%)",
  "hsl(30, 90%, 55%)",
  "hsl(0, 70%, 50%)",
  "hsl(280, 70%, 55%)",
  "hsl(320, 70%, 50%)",
];

const AnalyticsCharts = () => {
  const [rankData, setRankData] = useState<RankData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [examOptions, setExamOptions] = useState<{ id: string; name: string; academic_year: string }[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) fetchRankData();
  }, [selectedExam, selectedClass]);

  const fetchExams = async () => {
    const { data } = await supabase
      .from('exams')
      .select('id, name, academic_year')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setExamOptions(data);
      // Default to the current/latest exam
      const deployed = data.find((e: any) => e.is_deployed) || data[0];
      setSelectedExam(deployed?.id || data[0].id);
    }
    setIsLoading(false);
  };

  const fetchRankData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('ranks')
        .select('grade, percentage, is_passed, student_id, students(class_number, name)')
        .eq('exam_id', selectedExam);

      const { data, error } = await query;
      if (error) throw error;

      let filtered = (data || []) as unknown as RankData[];
      if (selectedClass !== "all") {
        filtered = filtered.filter(r => r.students?.class_number === parseInt(selectedClass));
      }
      setRankData(filtered);
    } catch (error) {
      console.error('Error fetching rank data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Grade distribution for pie chart
  const gradeDistribution = (() => {
    const counts: Record<string, number> = {};
    rankData.forEach(r => {
      counts[r.grade] = (counts[r.grade] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([grade, count]) => ({ grade, count, percentage: rankData.length > 0 ? ((count / rankData.length) * 100).toFixed(1) : "0" }))
      .sort((a, b) => {
        const order = ["A+", "A", "B+", "B", "C+", "C", "D"];
        return order.indexOf(a.grade) - order.indexOf(b.grade);
      });
  })();

  // Pass/Fail data
  const passCount = rankData.filter(r => r.is_passed).length;
  const failCount = rankData.length - passCount;
  const passRate = rankData.length > 0 ? ((passCount / rankData.length) * 100).toFixed(1) : "0";

  // Class-wise average percentage for bar chart
  const classWiseAvg = (() => {
    const classMap: Record<number, { total: number; count: number }> = {};
    rankData.forEach(r => {
      const cn = r.students?.class_number;
      if (cn) {
        if (!classMap[cn]) classMap[cn] = { total: 0, count: 0 };
        classMap[cn].total += r.percentage;
        classMap[cn].count += 1;
      }
    });
    return Object.entries(classMap)
      .map(([cls, { total, count }]) => ({
        class: `Class ${cls}`,
        average: parseFloat((total / count).toFixed(1)),
        students: count,
      }))
      .sort((a, b) => parseInt(a.class.replace("Class ", "")) - parseInt(b.class.replace("Class ", "")));
  })();

  // Score range distribution for radar chart
  const scoreRanges = (() => {
    const ranges = [
      { range: "90-100%", min: 90, max: 100, count: 0 },
      { range: "70-89%", min: 70, max: 89, count: 0 },
      { range: "45-69%", min: 45, max: 69, count: 0 },
      { range: "25-44%", min: 25, max: 44, count: 0 },
      { range: "0-24%", min: 0, max: 24, count: 0 },
    ];
    rankData.forEach(r => {
      const range = ranges.find(rng => r.percentage >= rng.min && r.percentage <= rng.max);
      if (range) range.count++;
    });
    return ranges;
  })();

  if (isLoading && examOptions.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  if (examOptions.length === 0) {
    return (
      <Card className="glass-effect">
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No exam data available</p>
          <p className="text-sm text-muted-foreground mt-1">Create an academic year and finalize ranks to see analytics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Select exam" />
          </SelectTrigger>
          <SelectContent>
            {examOptions.map(exam => (
              <SelectItem key={exam.id} value={exam.id}>
                {exam.name} ({exam.academic_year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {[5, 6, 7, 8, 9].map(c => (
              <SelectItem key={c} value={String(c)}>Class {c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-effect">
          <CardContent className="pt-6 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{rankData.length}</p>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-2xl font-bold text-success">{passRate}%</p>
            <p className="text-xs text-muted-foreground">Pass Rate</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {rankData.length > 0 ? (rankData.reduce((s, r) => s + r.percentage, 0) / rankData.length).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardContent className="pt-6 text-center">
            <PieIcon className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-2xl font-bold">{gradeDistribution[0]?.grade || "-"}</p>
            <p className="text-xs text-muted-foreground">Most Common Grade</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pass/Fail Pie */}
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              Pass / Fail Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rankData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Passed", value: passCount },
                      { name: "Failed", value: failCount },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    <Cell fill="hsl(150, 80%, 45%)" />
                    <Cell fill="hsl(0, 70%, 50%)" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gradeDistribution.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="grade" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={index} fill={GRADE_COLORS[entry.grade] || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Class-wise Average */}
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Class-wise Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classWiseAvg.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={classWiseAvg}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="class" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                  />
                  <Bar dataKey="average" name="Average %" fill="hsl(200, 90%, 50%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Score Range Radar */}
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              Score Range Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rankData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={scoreRanges}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Radar name="Students" dataKey="count" stroke="hsl(200, 90%, 50%)" fill="hsl(200, 90%, 50%)" fillOpacity={0.3} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsCharts;

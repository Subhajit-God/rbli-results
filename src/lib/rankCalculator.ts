import { supabase } from "@/integrations/supabase/client";

const getGrade = (percentage: number): string => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 45) return "C+";
  if (percentage >= 25) return "C";
  return "D";
};

export interface ClassRecalcResult {
  classNumber: number;
  studentsRanked: number;
  ties: number;
}

/**
 * Recalculate ranks for a single class within an exam.
 * Sort by total marks desc; ties broken by lower roll number (higher rank).
 */
export async function recalculateClassRanks(
  examId: string,
  classNumber: number
): Promise<ClassRecalcResult> {
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("*")
    .eq("class_number", classNumber);
  if (studentsError) throw studentsError;

  const { data: marks, error: marksError } = await supabase
    .from("marks")
    .select(`*, subjects:subject_id (full_marks_1, full_marks_2, full_marks_3, class_number)`)
    .eq("exam_id", examId);
  if (marksError) throw marksError;

  const studentTotals: Record<string, { total: number; fullMarks: number }> = {};
  marks?.forEach((mark: any) => {
    if (mark.subjects?.class_number !== classNumber) return;
    if (!studentTotals[mark.student_id]) studentTotals[mark.student_id] = { total: 0, fullMarks: 0 };
    const num = (v: any) =>
      ["AB", "EX"].includes((v || "").toString().toUpperCase()) ? 0 : parseFloat(v) || 0;
    studentTotals[mark.student_id].total += num(mark.marks_1) + num(mark.marks_2) + num(mark.marks_3);
    studentTotals[mark.student_id].fullMarks +=
      (mark.subjects?.full_marks_1 || 0) +
      (mark.subjects?.full_marks_2 || 0) +
      (mark.subjects?.full_marks_3 || 0);
  });

  const studentById: Record<string, any> = {};
  students?.forEach((s: any) => {
    studentById[s.id] = s;
  });

  const sorted = Object.entries(studentTotals)
    .filter(([sid]) => studentById[sid])
    .sort(([a, av], [b, bv]) => {
      if (bv.total !== av.total) return bv.total - av.total;
      return (studentById[a].roll_number ?? 0) - (studentById[b].roll_number ?? 0);
    });

  const totalCounts: Record<number, number> = {};
  sorted.forEach(([, v]) => {
    totalCounts[v.total] = (totalCounts[v.total] || 0) + 1;
  });

  const upserts = sorted.map(([studentId, { total, fullMarks }], i) => {
    const percentage = fullMarks > 0 ? (total / fullMarks) * 100 : 0;
    return {
      student_id: studentId,
      exam_id: examId,
      total_marks: total,
      percentage: parseFloat(percentage.toFixed(2)),
      grade: getGrade(percentage),
      rank: i + 1,
      is_passed: percentage >= 25,
      has_conflict: totalCounts[total] > 1,
    };
  });

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("ranks")
      .upsert(upserts, { onConflict: "student_id,exam_id" });
    if (error) throw error;
  }

  return {
    classNumber,
    studentsRanked: upserts.length,
    ties: upserts.filter((u) => u.has_conflict).length,
  };
}

export async function recalculateAllClasses(examId: string): Promise<ClassRecalcResult[]> {
  const classes = [5, 6, 7, 8, 9];
  const results: ClassRecalcResult[] = [];
  for (const c of classes) {
    results.push(await recalculateClassRanks(examId, c));
  }
  return results;
}

/**
 * Returns true if any marks for the exam were updated more recently than the ranks
 * (i.e. ranks are stale and must be recalculated before deployment).
 */
export async function ranksAreStale(examId: string): Promise<{
  stale: boolean;
  latestMarkAt: string | null;
  latestRankAt: string | null;
}> {
  const { data: latestMark } = await supabase
    .from("marks")
    .select("updated_at")
    .eq("exam_id", examId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestRank } = await supabase
    .from("ranks")
    .select("updated_at")
    .eq("exam_id", examId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const m = latestMark?.updated_at ? new Date(latestMark.updated_at).getTime() : 0;
  const r = latestRank?.updated_at ? new Date(latestRank.updated_at).getTime() : 0;

  return {
    stale: m > 0 && m > r,
    latestMarkAt: latestMark?.updated_at ?? null,
    latestRankAt: latestRank?.updated_at ?? null,
  };
}

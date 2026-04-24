import { supabase } from "@/integrations/supabase/client";

type DeployedExam = {
  id: string;
  name: string;
  academic_year: string;
  deployed_at: string | null;
};

const downloadJson = (data: unknown, fileName: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const buildPromotedStudents = (students: Array<any>) => {
  const activeStudents = students.filter((student) => student.class_number >= 5 && student.class_number <= 8);
  const groupedByNextClass = activeStudents.reduce<Record<number, Array<any>>>((groups, student) => {
    const nextClass = student.class_number + 1;
    groups[nextClass] = [...(groups[nextClass] || []), student];
    return groups;
  }, {});

  return Object.entries(groupedByNextClass).flatMap(([nextClass, group]) =>
    group
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((student, index) => {
        const nextRollNumber = index + 1;
        return {
          previous_record: student,
          promoted_record: {
            student_id: student.student_id,
            name: student.name,
            father_name: student.father_name,
            mother_name: student.mother_name,
            date_of_birth: student.date_of_birth,
            class_number: Number(nextClass),
            roll_number: nextRollNumber,
            section: nextRollNumber % 2 === 1 ? "A" : "B",
          },
        };
      })
  );
};

export const downloadPromotionExport = async (exam: DeployedExam) => {
  const [studentsRes, subjectsRes, marksRes, ranksRes] = await Promise.all([
    supabase.from("students").select("*").eq("academic_year_id", exam.id).order("class_number").order("name"),
    supabase.from("subjects").select("*").order("class_number").order("display_order"),
    supabase.from("marks").select("*").eq("exam_id", exam.id),
    supabase.from("ranks").select("*").eq("exam_id", exam.id),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  if (subjectsRes.error) throw subjectsRes.error;
  if (marksRes.error) throw marksRes.error;
  if (ranksRes.error) throw ranksRes.error;

  const students = studentsRes.data || [];
  const marks = marksRes.data || [];
  const subjects = subjectsRes.data || [];
  const ranks = ranksRes.data || [];
  const exportedAt = new Date().toISOString();

  const exportData = {
    exportedAt,
    exportType: "promotion_export",
    version: "1.0",
    deployedExam: exam,
    promotion: {
      promotedStudents: buildPromotedStudents(students),
      outgoingClass9Students: students.filter((student) => student.class_number === 9),
      rules: {
        classes5To8: "Promoted to the next class with new alphabetical roll numbers.",
        sections: "Odd roll numbers move to Section A; even roll numbers move to Section B.",
        class9: "Exported as outgoing Class 9 records for external Class 10 promotion handling.",
      },
    },
    data: {
      students,
      subjects,
      marks,
      ranks,
    },
    summary: {
      studentsCount: students.length,
      promotedStudentsCount: students.filter((student) => student.class_number >= 5 && student.class_number <= 8).length,
      outgoingClass9Count: students.filter((student) => student.class_number === 9).length,
      subjectsCount: subjects.length,
      marksCount: marks.length,
      ranksCount: ranks.length,
    },
  };

  const safeYear = exam.academic_year.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  downloadJson(exportData, `rbli-promotion-export-${safeYear}-${exportedAt.split("T")[0]}.json`);

  return exportData.summary;
};
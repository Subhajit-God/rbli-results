import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import JSZip from "jszip";

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

// ---------------------------------------------------------------------------
// Promotion Export ZIP — 5 Excel rosters (Class 6, 7, 8, 9, 10)
// Promotion rules:
//   • Class 5 → 6, 6 → 7, 7 → 8, 8 → 9 (current students promoted)
//   • Class 9 → Class 10 (exported only, leaves the school)
//   • New roll numbers assigned by rank (rank 1 = roll 1). Students with no
//     rank fall to the bottom, ordered by previous roll.
//   • Section: odd roll → A, even roll → B
//   • One worksheet per file; columns: SL.No, New Student ID, New Roll No,
//     Section, Name, Father, Mother, Date of Birth, Previous Class, Previous Roll
// ---------------------------------------------------------------------------

type StudentRow = {
  id: string;
  student_id: string;
  name: string;
  class_number: number;
  section: string;
  roll_number: number;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  academic_year_id: string | null;
};

type RankRow = {
  student_id: string;
  rank: number | null;
  total_marks: number;
};

const COLUMN_WIDTHS = [
  { wch: 8 },  // SL.No
  { wch: 22 }, // New Student ID
  { wch: 12 }, // New Roll No
  { wch: 10 }, // Section
  { wch: 28 }, // Name
  { wch: 26 }, // Father's Name
  { wch: 26 }, // Mother's Name
  { wch: 14 }, // DOB
  { wch: 14 }, // Previous Class
  { wch: 14 }, // Previous Roll
];

const buildClassSheet = (
  promotedTo: number,
  sourceStudents: StudentRow[],
  rankByStudentId: Map<string, RankRow>,
) => {
  // Sort by rank ascending; unranked students go last (by previous roll)
  const sorted = [...sourceStudents].sort((a, b) => {
    const ra = rankByStudentId.get(a.id)?.rank ?? Number.POSITIVE_INFINITY;
    const rb = rankByStudentId.get(b.id)?.rank ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return a.roll_number - b.roll_number;
  });

  const rows = sorted.map((student, index) => {
    const newRoll = index + 1;
    return {
      "SL.No": newRoll,
      "New Student ID": student.student_id,
      "New Roll No": newRoll,
      "Section": newRoll % 2 === 1 ? "A" : "B",
      "Name": student.name,
      "Father's Name": student.father_name,
      "Mother's Name": student.mother_name,
      "Date of Birth": student.date_of_birth,
      "Previous Class": student.class_number,
      "Previous Roll": student.roll_number,
    };
  });

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      "SL.No",
      "New Student ID",
      "New Roll No",
      "Section",
      "Name",
      "Father's Name",
      "Mother's Name",
      "Date of Birth",
      "Previous Class",
      "Previous Roll",
    ],
  });
  sheet["!cols"] = COLUMN_WIDTHS;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, `Class ${promotedTo}`);

  // Write to ArrayBuffer for zipping
  const arrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return { count: rows.length, arrayBuffer };
};

export const downloadPromotionZip = async (exam: DeployedExam) => {
  const [studentsRes, ranksRes] = await Promise.all([
    supabase
      .from("students")
      .select("*")
      .order("class_number")
      .order("roll_number"),
    supabase
      .from("ranks")
      .select("student_id, rank, total_marks")
      .eq("exam_id", exam.id),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  if (ranksRes.error) throw ranksRes.error;

  const students = (studentsRes.data || []) as StudentRow[];
  const ranks = (ranksRes.data || []) as RankRow[];
  const rankByStudentId = new Map<string, RankRow>(ranks.map((r) => [r.student_id, r]));

  const zip = new JSZip();
  const summary: Record<string, number> = {};

  // Class 5→6, 6→7, 7→8, 8→9, 9→10
  for (const fromClass of [5, 6, 7, 8, 9]) {
    const toClass = fromClass + 1;
    const source = students.filter((s) => s.class_number === fromClass);
    const { count, arrayBuffer } = buildClassSheet(toClass, source, rankByStudentId);
    summary[`class${toClass}`] = count;
    zip.file(`Class_${toClass}_Promotion_${exam.academic_year}.xlsx`, arrayBuffer);
  }

  // README inside the zip
  const readme = [
    "RBLI Promotion Export",
    "----------------------",
    `Source academic year : ${exam.academic_year}`,
    `Exam                 : ${exam.name}`,
    `Generated at         : ${new Date().toISOString()}`,
    "",
    "Files in this archive:",
    "  • Class_6_Promotion_*.xlsx  — promoted from Class 5",
    "  • Class_7_Promotion_*.xlsx  — promoted from Class 6",
    "  • Class_8_Promotion_*.xlsx  — promoted from Class 7",
    "  • Class_9_Promotion_*.xlsx  — promoted from Class 8",
    "  • Class_10_Promotion_*.xlsx — outgoing Class 9 (for next school)",
    "",
    "Promotion rules:",
    "  • New roll numbers assigned by rank (rank 1 = new roll 1).",
    "  • Section: odd new roll → A, even → B.",
    "  • Student IDs are preserved.",
    "",
    "Made With ❤️ By Subhajit Das Whose ID is 04070122000103",
  ].join("\n");
  zip.file("README.txt", readme);

  const blob = await zip.generateAsync({ type: "blob" });
  const safeYear = exam.academic_year.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rbli-promotion-${safeYear}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return summary;
};

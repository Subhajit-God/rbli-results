import { cn } from "@/lib/utils";
import schoolLogo from "@/assets/school-logo.png";

interface StudentDetails {
  name: string;
  classNumber: number;
  section: string;
  rollNumber: number;
  studentId: string;
  fatherName: string;
  motherName: string;
}

interface MarksRow {
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
}

interface ResultSummary {
  grandTotal: number;
  fullMarks: number;
  percentage: number;
  grade: string;
  isPassed: boolean;
  rank: number;
}

interface ResultCardPDFProps {
  examName: string;
  student: StudentDetails;
  marks: MarksRow[];
  summary: ResultSummary;
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A+': case 'A': return 'text-green-700';
    case 'B+': case 'B': return 'text-blue-700';
    case 'C+': case 'C': return 'text-yellow-700';
    default: return 'text-red-700';
  }
};

const ResultCardPDF = ({ examName, student, marks, summary }: ResultCardPDFProps) => {
  return (
    <div 
      id="result-pdf" 
      className="hidden print:block bg-white text-black"
      style={{ 
        width: '297mm', 
        height: '210mm', 
        padding: '10mm',
        fontSize: '10pt',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
        <div className="flex items-center gap-4">
          <img src={schoolLogo} alt="Logo" className="w-16 h-16" />
          <div>
            <h1 className="text-xl font-bold">RAMJIBANPUR BABULAL INSTITUTION</h1>
            <p className="text-sm">Estd. 1925 | Ramjibanpur, West Bengal</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold uppercase">{examName}</p>
          <p className="text-sm">Academic Year 2025</p>
        </div>
      </div>

      {/* Student Info - Two Column */}
      <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-100 p-3 rounded">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><strong>Student Name:</strong></p>
          <p>{student.name}</p>
          <p><strong>Student ID:</strong></p>
          <p>{student.studentId}</p>
          <p><strong>Father's Name:</strong></p>
          <p>{student.fatherName}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><strong>Class:</strong></p>
          <p>{student.classNumber} ({student.section})</p>
          <p><strong>Roll Number:</strong></p>
          <p>{student.rollNumber}</p>
          <p><strong>Mother's Name:</strong></p>
          <p>{student.motherName}</p>
        </div>
      </div>

      {/* Marks Table */}
      <table className="w-full border-collapse border border-black text-sm mb-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black p-2 text-left">Subject</th>
            <th className="border border-black p-2 text-center w-16">I<br/><span className="text-xs font-normal">(FM)</span></th>
            <th className="border border-black p-2 text-center w-16">II<br/><span className="text-xs font-normal">(FM)</span></th>
            <th className="border border-black p-2 text-center w-16">III<br/><span className="text-xs font-normal">(FM)</span></th>
            <th className="border border-black p-2 text-center w-20">Total</th>
            <th className="border border-black p-2 text-center w-16">%</th>
          </tr>
        </thead>
        <tbody>
          {marks.map((row, index) => (
            <tr key={index} className={index % 2 === 0 ? '' : 'bg-gray-50'}>
              <td className="border border-black p-2">{row.subject}</td>
              <td className="border border-black p-2 text-center">
                {row.marks1} <span className="text-xs text-gray-600">({row.fullMarks1})</span>
              </td>
              <td className="border border-black p-2 text-center">
                {row.marks2} <span className="text-xs text-gray-600">({row.fullMarks2})</span>
              </td>
              <td className="border border-black p-2 text-center">
                {row.marks3} <span className="text-xs text-gray-600">({row.fullMarks3})</span>
              </td>
              <td className="border border-black p-2 text-center font-bold">
                {row.total}/{row.fullTotal}
              </td>
              <td className="border border-black p-2 text-center">
                {row.percentage.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Section */}
      <div className="grid grid-cols-5 gap-4 border-2 border-black p-3 mb-4">
        <div className="text-center">
          <p className="text-xs text-gray-600 uppercase">Grand Total</p>
          <p className="text-lg font-bold">{summary.grandTotal}/{summary.fullMarks}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 uppercase">Percentage</p>
          <p className="text-lg font-bold">{summary.percentage.toFixed(2)}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 uppercase">Grade</p>
          <p className={cn("text-lg font-bold", getGradeColor(summary.grade))}>{summary.grade}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 uppercase">Result</p>
          <p className={cn(
            "text-lg font-bold",
            summary.isPassed ? 'text-green-700' : 'text-red-700'
          )}>
            {summary.isPassed ? 'PASS' : 'FAIL'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 uppercase">Class Rank</p>
          <p className="text-lg font-bold">{summary.rank}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end text-sm mt-8">
        <div className="text-center">
          <div className="border-t border-black pt-1 px-12">Class Teacher</div>
        </div>
        <div className="text-center text-xs text-gray-500">
          <p>This is a computer-generated result.</p>
          <p>Verified and published by the institution.</p>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-1 px-12">Principal</div>
        </div>
      </div>
    </div>
  );
};

export default ResultCardPDF;

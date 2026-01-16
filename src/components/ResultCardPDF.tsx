import { cn } from "@/lib/utils";
import schoolLogo from "@/assets/school-logo.png";
import { isAbsent, isExempt } from "@/components/AbsentBadge";

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

// School Stamp Component
const SchoolStamp = () => (
  <div 
    className="school-stamp"
    style={{
      position: 'absolute',
      right: '60px',
      bottom: '80px',
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      border: '3px double #1e40af',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.2,
      transform: 'rotate(-15deg)',
      backgroundColor: 'transparent',
      pointerEvents: 'none',
    }}
  >
    <div 
      style={{
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        borderRadius: '50%',
        border: '1px solid #1e40af',
        margin: '6px',
      }}
    />
    <div 
      style={{
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        borderRadius: '50%',
        border: '1px solid #1e40af',
        margin: '10px',
      }}
    />
    <span 
      style={{
        fontSize: '6px',
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1e40af',
        lineHeight: '1.1',
        maxWidth: '70px',
        textTransform: 'uppercase',
      }}
    >
      RAMJIBANPUR BABULAL INSTITUTION
    </span>
    <span 
      style={{
        fontSize: '8px',
        fontWeight: 'bold',
        color: '#1e40af',
        marginTop: '2px',
      }}
    >
      ★ ★ ★
    </span>
    <span 
      style={{
        fontSize: '5px',
        color: '#1e40af',
        textAlign: 'center',
      }}
    >
      Ramjibanpur, W.B.
    </span>
    <span 
      style={{
        fontSize: '6px',
        fontWeight: 'bold',
        color: '#1e40af',
        marginTop: '2px',
        letterSpacing: '1px',
      }}
    >
      OFFICIAL SEAL
    </span>
  </div>
);

const ResultCardPDF = ({ examName, student, marks, summary }: ResultCardPDFProps) => {
  return (
    <div 
      id="result-pdf" 
      className="result-card-pdf-container"
      style={{ 
        width: '297mm', 
        minHeight: '210mm',
        maxHeight: '210mm',
        padding: '8mm 10mm',
        fontSize: '10pt',
        fontFamily: '"Times New Roman", Times, Georgia, serif',
        backgroundColor: '#ffffff',
        color: '#000000',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pageBreakAfter: 'always',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Watermark Background */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-30deg)',
          fontSize: '80px',
          fontWeight: 'bold',
          color: 'rgba(0, 0, 0, 0.03)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        RBLI
      </div>

      {/* Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '3px double #1e40af',
          paddingBottom: '10px',
          marginBottom: '12px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src={schoolLogo} 
            alt="School Logo" 
            style={{ 
              width: '60px', 
              height: '60px',
              objectFit: 'contain',
            }} 
          />
          <div>
            <h1 
              style={{ 
                fontSize: '18pt', 
                fontWeight: 'bold',
                color: '#1e40af',
                margin: 0,
                letterSpacing: '1px',
              }}
            >
              RAMJIBANPUR BABULAL INSTITUTION
            </h1>
            <p style={{ fontSize: '9pt', margin: '2px 0 0 0', color: '#374151' }}>
              Estd. 1925 | Ramjibanpur, Dist. Paschim Medinipur, West Bengal
            </p>
            <p style={{ fontSize: '8pt', margin: '1px 0 0 0', color: '#6b7280', fontStyle: 'italic' }}>
              Affiliated to WBCHSE & WBBSE
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div 
            style={{
              backgroundColor: '#1e40af',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '4px',
              marginBottom: '4px',
            }}
          >
            <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
              {examName}
            </p>
          </div>
          <p style={{ fontSize: '9pt', margin: 0, color: '#374151' }}>
            Academic Session 2024-25
          </p>
        </div>
      </div>

      {/* Student Information */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '12px',
          backgroundColor: '#f8fafc',
          padding: '10px 14px',
          borderRadius: '4px',
          border: '1px solid #e2e8f0',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '4px', fontSize: '9pt' }}>
          <span style={{ color: '#6b7280' }}>Student Name:</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>{student.name}</span>
          <span style={{ color: '#6b7280' }}>Student ID:</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>{student.studentId}</span>
          <span style={{ color: '#6b7280' }}>Father's Name:</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>{student.fatherName}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '4px', fontSize: '9pt' }}>
          <span style={{ color: '#6b7280' }}>Class &amp; Section:</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>Class {student.classNumber} ({student.section})</span>
          <span style={{ color: '#6b7280' }}>Roll Number:</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>{student.rollNumber}</span>
          <span style={{ color: '#6b7280' }}>Mother's Name:</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>{student.motherName}</span>
        </div>
      </div>

      {/* Marks Table */}
      <table 
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '9pt',
          marginBottom: '12px',
          position: 'relative',
          zIndex: 1,
          pageBreakInside: 'avoid',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
            <th style={{ border: '1px solid #1e3a5f', padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>
              Subject
            </th>
            <th style={{ border: '1px solid #1e3a5f', padding: '8px 6px', textAlign: 'center', width: '70px', fontWeight: 600 }}>
              Paper I<br/><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>(Full Marks)</span>
            </th>
            <th style={{ border: '1px solid #1e3a5f', padding: '8px 6px', textAlign: 'center', width: '70px', fontWeight: 600 }}>
              Paper II<br/><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>(Full Marks)</span>
            </th>
            <th style={{ border: '1px solid #1e3a5f', padding: '8px 6px', textAlign: 'center', width: '70px', fontWeight: 600 }}>
              Paper III<br/><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>(Full Marks)</span>
            </th>
            <th style={{ border: '1px solid #1e3a5f', padding: '8px 6px', textAlign: 'center', width: '80px', fontWeight: 600 }}>
              Total
            </th>
            <th style={{ border: '1px solid #1e3a5f', padding: '8px 6px', textAlign: 'center', width: '60px', fontWeight: 600 }}>
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {marks.map((row, index) => (
            <tr 
              key={index} 
              style={{ 
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
              }}
            >
              <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 500, color: '#111827' }}>
                {row.subject}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', color: '#111827' }}>
                {isAbsent(row.marks1) ? (
                  <span style={{ 
                    backgroundColor: '#fecaca', 
                    color: '#991b1b', 
                    padding: '2px 6px', 
                    borderRadius: '3px', 
                    fontSize: '8pt',
                    fontWeight: 'bold' 
                  }}>AB</span>
                ) : isExempt(row.marks1) ? (
                  <span style={{ 
                    backgroundColor: '#e5e7eb', 
                    color: '#374151', 
                    padding: '2px 6px', 
                    borderRadius: '3px', 
                    fontSize: '8pt',
                    fontWeight: 'bold' 
                  }}>EX</span>
                ) : (
                  <>{row.marks1} <span style={{ fontSize: '7pt', color: '#6b7280' }}>({row.fullMarks1})</span></>
                )}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', color: '#111827' }}>
                {isAbsent(row.marks2) ? (
                  <span style={{ 
                    backgroundColor: '#fecaca', 
                    color: '#991b1b', 
                    padding: '2px 6px', 
                    borderRadius: '3px', 
                    fontSize: '8pt',
                    fontWeight: 'bold' 
                  }}>AB</span>
                ) : isExempt(row.marks2) ? (
                  <span style={{ 
                    backgroundColor: '#e5e7eb', 
                    color: '#374151', 
                    padding: '2px 6px', 
                    borderRadius: '3px', 
                    fontSize: '8pt',
                    fontWeight: 'bold' 
                  }}>EX</span>
                ) : (
                  <>{row.marks2} <span style={{ fontSize: '7pt', color: '#6b7280' }}>({row.fullMarks2})</span></>
                )}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', color: '#111827' }}>
                {isAbsent(row.marks3) ? (
                  <span style={{ 
                    backgroundColor: '#fecaca', 
                    color: '#991b1b', 
                    padding: '2px 6px', 
                    borderRadius: '3px', 
                    fontSize: '8pt',
                    fontWeight: 'bold' 
                  }}>AB</span>
                ) : isExempt(row.marks3) ? (
                  <span style={{ 
                    backgroundColor: '#e5e7eb', 
                    color: '#374151', 
                    padding: '2px 6px', 
                    borderRadius: '3px', 
                    fontSize: '8pt',
                    fontWeight: 'bold' 
                  }}>EX</span>
                ) : (
                  <>{row.marks3} <span style={{ fontSize: '7pt', color: '#6b7280' }}>({row.fullMarks3})</span></>
                )}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontWeight: 'bold', color: '#111827' }}>
                {row.total}/{row.fullTotal}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', color: '#111827' }}>
                {row.percentage.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Section */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          border: '2px solid #1e40af',
          padding: '10px',
          marginBottom: '12px',
          borderRadius: '4px',
          backgroundColor: '#f0f9ff',
          position: 'relative',
          zIndex: 1,
          pageBreakInside: 'avoid',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '7pt', color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Grand Total
          </p>
          <p style={{ fontSize: '14pt', fontWeight: 'bold', margin: '4px 0 0 0', color: '#111827' }}>
            {summary.grandTotal}/{summary.fullMarks}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '7pt', color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Percentage
          </p>
          <p style={{ fontSize: '14pt', fontWeight: 'bold', margin: '4px 0 0 0', color: '#111827' }}>
            {summary.percentage.toFixed(2)}%
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '7pt', color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Grade
          </p>
          <p style={{ 
            fontSize: '14pt', 
            fontWeight: 'bold', 
            margin: '4px 0 0 0',
            color: summary.grade === 'A+' || summary.grade === 'A' ? '#15803d' : 
                   summary.grade === 'B+' || summary.grade === 'B' ? '#1d4ed8' :
                   summary.grade === 'C+' || summary.grade === 'C' ? '#a16207' : '#dc2626'
          }}>
            {summary.grade}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '7pt', color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Result
          </p>
          <p style={{ 
            fontSize: '14pt', 
            fontWeight: 'bold', 
            margin: '4px 0 0 0',
            color: summary.isPassed ? '#15803d' : '#dc2626'
          }}>
            {summary.isPassed ? 'PASS' : 'FAIL'}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '7pt', color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Class Rank
          </p>
          <p style={{ fontSize: '14pt', fontWeight: 'bold', margin: '4px 0 0 0', color: '#111827' }}>
            {summary.rank}
          </p>
        </div>
      </div>

      {/* Signatures Footer */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: '16px',
          paddingTop: '10px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', width: '140px' }}>
          <div style={{ 
            borderTop: '1px solid #1e293b', 
            paddingTop: '6px',
            marginTop: '35px',
            fontSize: '9pt',
            color: '#374151',
            fontWeight: 500,
          }}>
            Class Teacher
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '140px' }}>
          <div style={{ 
            borderTop: '1px solid #1e293b', 
            paddingTop: '6px',
            marginTop: '35px',
            fontSize: '9pt',
            color: '#374151',
            fontWeight: 500,
          }}>
            Exam Controller
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '140px', position: 'relative' }}>
          <div style={{ 
            borderTop: '1px solid #1e293b', 
            paddingTop: '6px',
            marginTop: '35px',
            fontSize: '9pt',
            color: '#374151',
            fontWeight: 500,
          }}>
            Principal
          </div>
        </div>
      </div>

      {/* Official School Stamp */}
      <SchoolStamp />

      {/* Footer */}
      <div 
        style={{
          marginTop: '14px',
          paddingTop: '8px',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <p style={{ fontSize: '7pt', color: '#6b7280', margin: 0, fontStyle: 'italic' }}>
          This is a computer-generated result card. Verified and published by the institution.
        </p>
        <p style={{ fontSize: '7pt', color: '#9ca3af', margin: '2px 0 0 0' }}>
          Excellence in Education Since 1925 | Made With ❤️ By Subhajit Das (ID: 04070122000103)
        </p>
      </div>
    </div>
  );
};

export default ResultCardPDF;

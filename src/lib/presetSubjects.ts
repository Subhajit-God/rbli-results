// Class-wise preset subjects as per the school curriculum
export const PRESET_SUBJECTS: Record<number, string[]> = {
  5: [
    "Bengali",
    "English", 
    "Math",
    "Our Environment",
    "Work Education",
    "Health Education"
  ],
  6: [
    "Bengali",
    "English",
    "Geography",
    "History",
    "Science",
    "Maths",
    "Health Education",
    "Work Education"
  ],
  7: [
    "Bengali",
    "English",
    "Sanskrit",
    "Geography",
    "History",
    "Science",
    "Maths",
    "Health Education",
    "Work Education"
  ],
  8: [
    "Bengali",
    "English",
    "Sanskrit",
    "Geography",
    "History",
    "Science",
    "Maths",
    "Health Education",
    "Work Education"
  ],
  9: [
    "Bengali",
    "English",
    "Geography",
    "Life and Physical Science",
    "Maths",
    "History"
  ]
};

// Subjects that require admin to manually set marks (no predefined full marks)
export const MANUAL_MARKS_SUBJECTS = ["Health Education", "Work Education"];

// Check if a subject requires manual marks configuration
export const requiresManualMarks = (subjectName: string, classNumber: number): boolean => {
  // For classes 5-8, Health Education and Work Education need manual marks
  if (classNumber >= 5 && classNumber <= 8) {
    return MANUAL_MARKS_SUBJECTS.some(s => 
      subjectName.toLowerCase() === s.toLowerCase()
    );
  }
  return false;
};

// Default full marks structure - Class 5 and 9 use standard values
export const DEFAULT_FULL_MARKS = {
  full_marks_1: 30, // Summative I
  full_marks_2: 50, // Summative II  
  full_marks_3: 20  // Summative III
};

// Class 6, 7, 8 have different Summative III marks (70)
export const getDefaultFullMarks = (classNumber: number, subjectName?: string) => {
  // If subject requires manual marks, return 0 (admin must set)
  if (subjectName && requiresManualMarks(subjectName, classNumber)) {
    return {
      full_marks_1: 0,
      full_marks_2: 0,
      full_marks_3: 0
    };
  }
  
  // Class 6, 7, 8 have: I=30, II=50, III=70
  if (classNumber >= 6 && classNumber <= 8) {
    return {
      full_marks_1: 30, // Summative I
      full_marks_2: 50, // Summative II  
      full_marks_3: 70  // Summative III for Class 6,7,8
    };
  }
  
  // Class 5 and 9: I=30, II=50, III=20
  return DEFAULT_FULL_MARKS;
};

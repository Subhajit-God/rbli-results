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

// Default full marks structure
export const DEFAULT_FULL_MARKS = {
  full_marks_1: 10, // Summative I (Class 5 default)
  full_marks_2: 20, // Summative II  
  full_marks_3: 50  // Summative III
};

// Class-wise full marks distribution
export const getDefaultFullMarks = (classNumber: number, subjectName?: string) => {
  // If subject requires manual marks, return 0 (admin must set)
  if (subjectName && requiresManualMarks(subjectName, classNumber)) {
    return {
      full_marks_1: 0,
      full_marks_2: 0,
      full_marks_3: 0
    };
  }
  
  // Class 5: I=10, II=20, III=50
  if (classNumber === 5) {
    return {
      full_marks_1: 10,
      full_marks_2: 20,
      full_marks_3: 50
    };
  }

  // Class 6, 7, 8: I=30, II=50, III=70
  if (classNumber >= 6 && classNumber <= 8) {
    return {
      full_marks_1: 30,
      full_marks_2: 50,
      full_marks_3: 70
    };
  }
  
  // Class 9: I=40, II=40, III=90
  if (classNumber === 9) {
    return {
      full_marks_1: 40,
      full_marks_2: 40,
      full_marks_3: 90
    };
  }

  // Fallback
  return DEFAULT_FULL_MARKS;
};

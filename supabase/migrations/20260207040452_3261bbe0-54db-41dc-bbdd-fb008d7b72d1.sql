-- Add academic_year_id to students table to link students to specific academic years
ALTER TABLE public.students 
ADD COLUMN academic_year_id uuid REFERENCES public.exams(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX idx_students_academic_year ON public.students(academic_year_id);

-- Update RLS policy for students to include academic year context
-- Existing policies remain, no changes needed as admin can manage all students
-- Add is_current column to exams table to track the current academic year
ALTER TABLE public.exams ADD COLUMN is_current boolean NOT NULL DEFAULT false;

-- Create a function to ensure only one exam can be current at a time
CREATE OR REPLACE FUNCTION public.ensure_single_current_exam()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = true THEN
        -- Set all other exams to not current
        UPDATE public.exams SET is_current = false WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to enforce single current exam
CREATE TRIGGER ensure_single_current_exam_trigger
BEFORE INSERT OR UPDATE ON public.exams
FOR EACH ROW
WHEN (NEW.is_current = true)
EXECUTE FUNCTION public.ensure_single_current_exam();
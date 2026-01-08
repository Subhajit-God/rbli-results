-- Add display_order column to subjects table for custom ordering
ALTER TABLE public.subjects ADD COLUMN display_order integer DEFAULT 0;

-- Initialize display_order based on existing alphabetical order within each class
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY class_number ORDER BY name) as rn
  FROM public.subjects
)
UPDATE public.subjects s
SET display_order = o.rn
FROM ordered o
WHERE s.id = o.id;
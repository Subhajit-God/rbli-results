-- 1. Class lock table
CREATE TABLE IF NOT EXISTS public.class_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_number integer NOT NULL CHECK (class_number BETWEEN 5 AND 9),
  exam_id uuid NOT NULL,
  locked_by uuid NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  note text,
  UNIQUE (class_number, exam_id)
);

ALTER TABLE public.class_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view class locks"
  ON public.class_locks FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert class locks"
  ON public.class_locks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND locked_by = auth.uid());

CREATE POLICY "Admins can delete class locks"
  ON public.class_locks FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2. Helper: is the class+exam locked?
CREATE OR REPLACE FUNCTION public.is_class_locked(_class_number integer, _exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_locks
    WHERE class_number = _class_number AND exam_id = _exam_id
  )
$$;

-- 3. Trigger to block updates/deletes on marks when class is locked
CREATE OR REPLACE FUNCTION public.enforce_class_lock_on_marks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _class integer;
BEGIN
  SELECT s.class_number INTO _class
  FROM public.students s
  WHERE s.id = COALESCE(NEW.student_id, OLD.student_id)
  LIMIT 1;

  IF _class IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF public.is_class_locked(_class, COALESCE(NEW.exam_id, OLD.exam_id)) THEN
    RAISE EXCEPTION 'Class % marks are locked for this exam. Unlock the class first.', _class
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_class_lock_on_marks ON public.marks;
CREATE TRIGGER trg_enforce_class_lock_on_marks
BEFORE UPDATE OR DELETE ON public.marks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_class_lock_on_marks();
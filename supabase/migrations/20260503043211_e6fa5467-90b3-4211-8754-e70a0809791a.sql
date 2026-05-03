
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS scheduled_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_deploy boolean NOT NULL DEFAULT false;

-- Visible to public so countdown can be shown before deployment
DROP POLICY IF EXISTS "Anyone can view scheduled or deployed exams" ON public.exams;
CREATE POLICY "Anyone can view scheduled or deployed exams"
  ON public.exams FOR SELECT TO public
  USING (is_deployed = true OR scheduled_release_at IS NOT NULL);

-- Auto-flip is_deployed when the scheduled time has passed (cheap helper)
CREATE OR REPLACE FUNCTION public.activate_scheduled_releases()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n integer;
BEGIN
  WITH upd AS (
    UPDATE public.exams
       SET is_deployed = true,
           deployed_at = COALESCE(deployed_at, now())
     WHERE auto_deploy = true
       AND is_deployed = false
       AND scheduled_release_at IS NOT NULL
       AND scheduled_release_at <= now()
     RETURNING 1
  )
  SELECT count(*) INTO _n FROM upd;
  RETURN _n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_scheduled_releases() TO anon, authenticated;

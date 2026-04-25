-- Track each public result-lookup attempt by IP for rate limiting and auditing
CREATE TABLE public.lookup_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  student_id TEXT,
  class_number INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  attempt_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lookup_attempts_ip_date ON public.lookup_attempts(ip_address, attempt_date);
CREATE INDEX idx_lookup_attempts_created_at ON public.lookup_attempts(created_at DESC);

ALTER TABLE public.lookup_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view attempt logs; nobody can insert/update/delete from client (edge function uses service role)
CREATE POLICY "Admins can view lookup attempts"
ON public.lookup_attempts
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));
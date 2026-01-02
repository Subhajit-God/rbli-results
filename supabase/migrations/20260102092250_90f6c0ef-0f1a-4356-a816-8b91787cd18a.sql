-- Create admin role enum
CREATE TYPE public.admin_role AS ENUM ('admin');

-- Create admin_roles table for role-based access
CREATE TABLE public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role admin_role NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on admin_roles
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- RLS policies for admin_roles
CREATE POLICY "Admins can view their own role"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create exams table
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    is_deployed BOOLEAN NOT NULL DEFAULT false,
    deployed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view deployed exams"
ON public.exams
FOR SELECT
USING (is_deployed = true);

CREATE POLICY "Admins can manage exams"
ON public.exams
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create subjects table
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    class_number INTEGER NOT NULL CHECK (class_number >= 5 AND class_number <= 9),
    full_marks_1 INTEGER NOT NULL DEFAULT 30,
    full_marks_2 INTEGER NOT NULL DEFAULT 50,
    full_marks_3 INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(name, class_number)
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subjects"
ON public.subjects
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage subjects"
ON public.subjects
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create students table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    class_number INTEGER NOT NULL CHECK (class_number >= 5 AND class_number <= 9),
    section TEXT NOT NULL,
    roll_number INTEGER NOT NULL,
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view students for result lookup"
ON public.students
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage students"
ON public.students
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create marks table
CREATE TABLE public.marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    marks_1 TEXT, -- Can be number, 'AB', or 'EX'
    marks_2 TEXT,
    marks_3 TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, subject_id, exam_id)
);

ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view marks for deployed exams"
ON public.marks
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.exams 
        WHERE exams.id = marks.exam_id 
        AND exams.is_deployed = true
    )
);

CREATE POLICY "Admins can manage marks"
ON public.marks
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create ranks table
CREATE TABLE public.ranks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    total_marks NUMERIC NOT NULL DEFAULT 0,
    percentage NUMERIC NOT NULL DEFAULT 0,
    grade TEXT NOT NULL DEFAULT 'D',
    rank INTEGER,
    is_passed BOOLEAN NOT NULL DEFAULT false,
    has_conflict BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, exam_id)
);

ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view ranks for deployed exams"
ON public.ranks
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.exams 
        WHERE exams.id = ranks.exam_id 
        AND exams.is_deployed = true
    )
);

CREATE POLICY "Admins can manage ranks"
ON public.ranks
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create activity_logs table
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Create deployment_status table
CREATE TABLE public.deployment_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL UNIQUE,
    all_marks_entered BOOLEAN NOT NULL DEFAULT false,
    all_marks_locked BOOLEAN NOT NULL DEFAULT false,
    all_ranks_finalized BOOLEAN NOT NULL DEFAULT false,
    no_conflicts BOOLEAN NOT NULL DEFAULT false,
    full_marks_configured BOOLEAN NOT NULL DEFAULT false,
    can_deploy BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deployment_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage deployment status"
ON public.deployment_status
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marks_updated_at
BEFORE UPDATE ON public.marks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ranks_updated_at
BEFORE UPDATE ON public.ranks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deployment_status_updated_at
BEFORE UPDATE ON public.deployment_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
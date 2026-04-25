// Per-section data fetch hooks. Each admin section (students, marks, ranks, deploy)
// imports only the hook(s) it needs so unrelated queries don't run on mount.
//
// Each hook returns { data, isLoading, error, refetch } — a familiar shape
// without pulling in @tanstack/react-query just for this layer.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

function useAbortableQuery<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await fetcher(controller.signal);
      if (!controller.signal.aborted) {
        setState({ data, isLoading: false, error: null });
      }
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === "AbortError") return;
      setState({ data: null, isLoading: false, error: err });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher]);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
  }, [run]);

  return { ...state, refetch: run };
}

// ---------------- Students ----------------
export function useAdminStudents(classFilter?: number) {
  const fetcher = useCallback(
    async (_signal: AbortSignal) => {
      let q = supabase
        .from("students")
        .select("id, student_id, name, class_number, section, roll_number, date_of_birth, father_name, mother_name, academic_year_id")
        .order("class_number", { ascending: true })
        .order("section", { ascending: true })
        .order("roll_number", { ascending: true });
      if (classFilter) q = q.eq("class_number", classFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    [classFilter],
  );
  return useAbortableQuery(fetcher);
}

// ---------------- Marks ----------------
export function useAdminMarks(examId?: string, classNumber?: number) {
  const fetcher = useCallback(
    async (_signal: AbortSignal) => {
      if (!examId) return [];
      let q = supabase
        .from("marks")
        .select(
          "id, student_id, subject_id, exam_id, marks_1, marks_2, marks_3, is_locked, students!inner(class_number)",
        )
        .eq("exam_id", examId);
      if (classNumber) q = q.eq("students.class_number", classNumber);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    [examId, classNumber],
  );
  return useAbortableQuery(fetcher);
}

// ---------------- Ranks ----------------
export function useAdminRanks(examId?: string) {
  const fetcher = useCallback(
    async (_signal: AbortSignal) => {
      if (!examId) return [];
      const { data, error } = await supabase
        .from("ranks")
        .select("id, student_id, exam_id, total_marks, percentage, grade, rank, is_passed, has_conflict")
        .eq("exam_id", examId)
        .order("rank", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
    [examId],
  );
  return useAbortableQuery(fetcher);
}

// ---------------- Deployment status ----------------
export function useAdminDeployStatus(examId?: string) {
  const fetcher = useCallback(
    async (_signal: AbortSignal) => {
      if (!examId) return null;
      const { data, error } = await supabase
        .from("deployment_status")
        .select("*")
        .eq("exam_id", examId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    [examId],
  );
  return useAbortableQuery(fetcher);
}

// ---------------- Subjects (often needed alongside marks) ----------------
export function useAdminSubjects(classNumber?: number) {
  const fetcher = useCallback(
    async (_signal: AbortSignal) => {
      let q = supabase
        .from("subjects")
        .select("id, name, class_number, full_marks_1, full_marks_2, full_marks_3, display_order")
        .order("class_number", { ascending: true })
        .order("display_order", { ascending: true });
      if (classNumber) q = q.eq("class_number", classNumber);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    [classNumber],
  );
  return useAbortableQuery(fetcher);
}

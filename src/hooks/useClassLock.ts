import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Class-wise marks lock. Server-enforced via the
 * `enforce_class_lock_on_marks` trigger — the UI mirrors state but
 * the database is the source of truth.
 */
export const useClassLock = (classNumber: number | null, examId: string | null) => {
  const [isLocked, setIsLocked] = useState(false);
  const [lockInfo, setLockInfo] = useState<{ locked_at: string; locked_by: string; note: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!classNumber || !examId) {
      setIsLocked(false);
      setLockInfo(null);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from("class_locks")
      .select("locked_at, locked_by, note")
      .eq("class_number", classNumber)
      .eq("exam_id", examId)
      .maybeSingle();
    setIsLocked(!!data);
    setLockInfo(data ?? null);
    setIsLoading(false);
  }, [classNumber, examId]);

  useEffect(() => { refetch(); }, [refetch]);

  const lock = useCallback(async (note?: string) => {
    if (!classNumber || !examId) return { error: new Error("Missing class/exam") };
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return { error: new Error("Not authenticated") };
    const { error } = await supabase.from("class_locks").insert({
      class_number: classNumber,
      exam_id: examId,
      locked_by: auth.user.id,
      note: note ?? null,
    });
    if (!error) {
      await supabase.from("activity_logs").insert({
        action: "CLASS_MARKS_LOCKED",
        details: { class_number: classNumber, exam_id: examId },
      });
      await refetch();
    }
    return { error };
  }, [classNumber, examId, refetch]);

  const unlock = useCallback(async () => {
    if (!classNumber || !examId) return { error: new Error("Missing class/exam") };
    const { error } = await supabase
      .from("class_locks")
      .delete()
      .eq("class_number", classNumber)
      .eq("exam_id", examId);
    if (!error) {
      await supabase.from("activity_logs").insert({
        action: "CLASS_MARKS_UNLOCKED",
        details: { class_number: classNumber, exam_id: examId },
      });
      await refetch();
    }
    return { error };
  }, [classNumber, examId, refetch]);

  return { isLocked, lockInfo, isLoading, lock, unlock, refetch };
};

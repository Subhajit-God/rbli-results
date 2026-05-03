import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DeployedExam {
  id: string;
  academic_year: string;
  deployed_at: string | null;
  scheduled_release_at?: string | null;
  is_deployed?: boolean;
  name?: string;
}

export const useDeploymentStatus = () => {
  const [hasDeployedExam, setHasDeployedExam] = useState(false);
  const [deployedExam, setDeployedExam] = useState<DeployedExam | null>(null);
  const [scheduledExam, setScheduledExam] = useState<DeployedExam | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkDeploymentStatus = async () => {
    try {
      // Activate any scheduled releases whose time has passed
      await supabase.rpc("activate_scheduled_releases" as any).catch(() => {});
      // Most recently deployed
      const { data: live } = await supabase
        .from("exams")
        .select("id, name, academic_year, deployed_at, scheduled_release_at, is_deployed")
        .eq("is_deployed", true)
        .order("deployed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (live) {
        setHasDeployedExam(true);
        setDeployedExam(live);
      } else {
        setHasDeployedExam(false);
        setDeployedExam(null);
      }

      // Upcoming scheduled (not yet live)
      const nowIso = new Date().toISOString();
      const { data: sched } = await supabase
        .from("exams")
        .select("id, name, academic_year, deployed_at, scheduled_release_at, is_deployed")
        .eq("is_deployed", false)
        .not("scheduled_release_at", "is", null)
        .gt("scheduled_release_at", nowIso)
        .order("scheduled_release_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      setScheduledExam(sched ?? null);
    } catch (error) {
      console.error("Error checking deployment status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkDeploymentStatus();
  }, []);

  return {
    hasDeployedExam,
    deployedExam,
    scheduledExam,
    isLoading,
    refetch: checkDeploymentStatus,
  };
};

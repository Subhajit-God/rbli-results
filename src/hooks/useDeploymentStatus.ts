import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DeployedExam {
  id: string;
  academic_year: string;
  deployed_at: string;
}

export const useDeploymentStatus = () => {
  const [hasDeployedExam, setHasDeployedExam] = useState(false);
  const [deployedExam, setDeployedExam] = useState<DeployedExam | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkDeploymentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, academic_year, deployed_at')
        .eq('is_deployed', true)
        .order('deployed_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking deployment status:', error);
      }

      if (data) {
        setHasDeployedExam(true);
        setDeployedExam(data);
      } else {
        setHasDeployedExam(false);
        setDeployedExam(null);
      }
    } catch (error) {
      console.error('Error checking deployment status:', error);
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
    isLoading, 
    refetch: checkDeploymentStatus 
  };
};

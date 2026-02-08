import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CurrentAcademicYear {
  id: string;
  name: string;
  academic_year: string;
  is_deployed: boolean;
}

export const useCurrentAcademicYear = () => {
  const [currentYear, setCurrentYear] = useState<CurrentAcademicYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentYear = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, name, academic_year, is_deployed')
        .eq('is_current', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching current academic year:', error);
      }
      
      setCurrentYear(data || null);
    } catch (error) {
      console.error('Error fetching current academic year:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentYear();
  }, []);

  return { currentYear, isLoading, refetch: fetchCurrentYear };
};

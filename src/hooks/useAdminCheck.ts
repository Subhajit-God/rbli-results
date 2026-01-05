import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAdminCheck = () => {
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const { count, error } = await supabase
        .from('admin_roles')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      setAdminExists((count ?? 0) > 0);
    } catch (error) {
      console.error('Error checking admin:', error);
      setAdminExists(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { adminExists, isLoading, refetch: checkAdminExists };
};

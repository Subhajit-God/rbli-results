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
      // Use the security definer function to bypass RLS
      const { data, error } = await supabase.rpc('admin_exists');

      if (error) throw error;
      setAdminExists(data === true);
    } catch (error) {
      console.error('Error checking admin:', error);
      // On error, assume admin exists for security (prevents unauthorized registration)
      setAdminExists(true);
    } finally {
      setIsLoading(false);
    }
  };

  return { adminExists, isLoading, refetch: checkAdminExists };
};

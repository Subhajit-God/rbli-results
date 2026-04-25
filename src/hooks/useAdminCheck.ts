// Cached admin check — caches "admin exists" globally and per-session admin role
// so we don't issue an RPC per render.
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EXISTS_CACHE_KEY = "rbi:admin_exists";
const IS_ADMIN_CACHE_KEY = "rbi:is_admin";
const TTL_MS = 5 * 60 * 1000; // 5 minutes

type CachedBool = { value: boolean; ts: number };

function readCache(key: string, storage: Storage): boolean | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBool;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: boolean, storage: Storage) {
  try {
    storage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function clearAdminCheckCache() {
  try {
    sessionStorage.removeItem(ADMIN_EXISTS_CACHE_KEY);
    sessionStorage.removeItem(IS_ADMIN_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export const useAdminCheck = () => {
  const cached =
    typeof window !== "undefined"
      ? readCache(ADMIN_EXISTS_CACHE_KEY, sessionStorage)
      : null;

  const [adminExists, setAdminExists] = useState<boolean | null>(cached);
  const [isLoading, setIsLoading] = useState(cached === null);

  const checkAdminExists = async (force = false) => {
    if (!force) {
      const fresh = readCache(ADMIN_EXISTS_CACHE_KEY, sessionStorage);
      if (fresh !== null) {
        setAdminExists(fresh);
        setIsLoading(false);
        return;
      }
    }

    try {
      const { data, error } = await supabase.rpc("admin_exists");
      if (error) throw error;
      const exists = data === true;
      setAdminExists(exists);
      writeCache(ADMIN_EXISTS_CACHE_KEY, exists, sessionStorage);
    } catch (error) {
      console.error("Error checking admin:", error);
      // Fail closed: assume admin exists to prevent unauthorized registration
      setAdminExists(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cached === null) {
      checkAdminExists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { adminExists, isLoading, refetch: () => checkAdminExists(true) };
};

// Cached "is current user an admin?" check.
export async function isCurrentUserAdmin(userId: string, force = false): Promise<boolean> {
  if (!force) {
    const fresh = readCache(`${IS_ADMIN_CACHE_KEY}:${userId}`, sessionStorage);
    if (fresh !== null) return fresh;
  }
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error) {
    console.error("is_admin RPC error:", error);
    return false;
  }
  const result = data === true;
  writeCache(`${IS_ADMIN_CACHE_KEY}:${userId}`, result, sessionStorage);
  return result;
}

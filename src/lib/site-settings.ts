import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FeatureToggles = {
  ai_exam: boolean;
  ai_tutor: boolean;
  summaries: boolean;
  worksheets: boolean;
  channels: boolean;
  courses: boolean;
  gpa: boolean;
};

export const DEFAULT_TOGGLES: FeatureToggles = {
  ai_exam: true, ai_tutor: true, summaries: true,
  worksheets: true, channels: true, courses: true, gpa: true,
};

export type BrandSettings = {
  name: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  whatsapp: string;
  facebook: string;
  jerusalem_icon_url: string;
};

export const DEFAULT_BRAND: BrandSettings = {
  name: "المنارة - المنصة التعليمية الفلسطينية",
  logo_url: "", contact_email: "info@al-manara.ps",
  contact_phone: "", whatsapp: "", facebook: "", jerusalem_icon_url: "",
};

function useSettingValue<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase
      .from("site_settings").select("value").eq("key", key).maybeSingle();
    if (data?.value && typeof data.value === "object") {
      setValue({ ...fallback, ...(data.value as Partial<T>) } as T);
    } else if (data?.value !== undefined && data?.value !== null) {
      setValue(data.value as T);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`realtime:site_settings_${key}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: `key=eq.${key}` },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, loading, refresh };
}

export function useFeatureToggles() {
  return useSettingValue<FeatureToggles>("feature_toggles", DEFAULT_TOGGLES);
}

export function useBrand() {
  return useSettingValue<BrandSettings>("brand", DEFAULT_BRAND);
}

export function useVisitorCount() {
  const [count, setCount] = useState<number>(0);

  const refresh = async () => {
    const { data } = await supabase
      .from("site_settings").select("value").eq("key", "visitor_count").maybeSingle();
    if (typeof data?.value === "number") setCount(data.value);
    else if (typeof data?.value === "string") setCount(Number(data.value) || 0);
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("realtime:visitor_count")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.visitor_count" },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return count;
}

/** Admin-only: total registered users in auth.users. */
export function useRegisteredUserCount() {
  const [count, setCount] = useState<number>(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_registered_user_count");
      if (!alive) return;
      if (error) { console.warn("[registered]", error.message); return; }
      if (typeof data === "number") setCount(data);
      else if (typeof data === "string") setCount(Number(data) || 0);
    };
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return count;
}

export type RegisteredUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
};

/** Admin-only: full list of registered users from auth.users. */
export function useRegisteredUsers() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: RegisteredUser[] | null; error: { message: string } | null }>)("list_registered_users");
    if (error) { setError(error.message); setLoading(false); return; }
    setUsers((data as RegisteredUser[]) || []);
    setError(null);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  return { users, loading, error, refresh };
}

export type AppRole = "admin" | "teacher" | "student";

export type UserWithRoles = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: AppRole[];
};

/** Admin-only: users joined with their roles. */
export function useUsersWithRoles() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: UserWithRoles[] | null; error: { message: string } | null }>)("list_users_with_roles");
    if (error) { setError(error.message); setLoading(false); return; }
    setUsers((data as UserWithRoles[]) || []);
    setError(null);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);
  return { users, loading, error, refresh };
}

export async function setUserRole(targetId: string, role: AppRole) {
  const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)(
    "set_user_role", { _target: targetId, _role: role }
  );
  return error;
}

export async function removeUserRole(targetId: string, role: AppRole) {
  const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)(
    "remove_user_role", { _target: targetId, _role: role }
  );
  return error;
}

/** Admin-managed Quranic verses list (site_settings.quranic_verses). */
export function useQuranicVerses() {
  const [items, setItems] = useState<string[]>([]);

  const refresh = async () => {
    const { data } = await supabase
      .from("site_settings").select("value").eq("key", "quranic_verses").maybeSingle();
    setItems(Array.isArray(data?.value) ? (data.value as string[]) : []);
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`realtime:site_settings_quran:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.quranic_verses" },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const save = async (next: string[]) => {
    const { error } = await supabase.from("site_settings").upsert({
      key: "quranic_verses", value: next as unknown as never, updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    setItems(next);
  };

  return { items, save, refresh };
}

/** Atomic increment via RPC. Call once per browser session. */
export function useVisitorPing() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const KEY = "manara.visitor.pinged.v1";
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    // Fire and forget
    supabase.rpc("increment_visitor_count").then(({ error }) => {
      if (error) console.warn("[visitor]", error.message);
    });
  }, []);
}
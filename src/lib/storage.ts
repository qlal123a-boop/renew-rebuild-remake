// LocalStorage-backed admin data: worksheets, channels, and lessons.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lesson } from "./curriculum";
import { toast } from "sonner";

export type WorksheetLink = {
  id: string;
  gradeId: number;
  subject: string;
  title: string;
  url: string;
  source?: string;
  createdAt?: string;
};

export type ChannelLink = {
  id: string;
  subject: string;
  name: string;
  url: string;
  provider: "Rawafed" | "Palestine Educational Portal" | "YouTube" | "Other";
};

export type { Lesson };

// ---------- Mappers ----------
type LessonRow = {
  id: string; grade_id: number; subject: string; semester: number;
  title: string; description: string; video_url: string;
  worksheet_url: string | null; worksheet_name: string | null;
};
const lessonFromRow = (r: LessonRow): Lesson => ({
  id: r.id, gradeId: r.grade_id, subject: r.subject, semester: r.semester as 1 | 2,
  title: r.title, description: r.description, videoUrl: r.video_url,
  worksheetUrl: r.worksheet_url ?? undefined, worksheetName: r.worksheet_name ?? undefined,
});
const lessonToInsert = (l: Lesson) => ({
  id: l.id, grade_id: l.gradeId, subject: l.subject, semester: l.semester,
  title: l.title, description: l.description ?? "", video_url: l.videoUrl ?? "",
  worksheet_url: l.worksheetUrl ?? null, worksheet_name: l.worksheetName ?? null,
});

type WsRow = { id: string; grade_id: number; subject: string; title: string; url: string; source: string | null; created_at?: string };
const wsFromRow = (r: WsRow): WorksheetLink => ({
  id: r.id, gradeId: r.grade_id, subject: r.subject, title: r.title, url: r.url, source: r.source ?? undefined, createdAt: r.created_at,
});
const wsToInsert = (w: WorksheetLink) => ({
  id: w.id, grade_id: w.gradeId, subject: w.subject, title: w.title, url: w.url, source: w.source ?? null,
});

type ChRow = { id: string; subject: string; name: string; url: string; provider: string };
const chFromRow = (r: ChRow): ChannelLink => ({
  id: r.id, subject: r.subject, name: r.name, url: r.url, provider: r.provider as ChannelLink["provider"],
});
const chToInsert = (c: ChannelLink) => ({
  id: c.id, subject: c.subject, name: c.name, url: c.url, provider: c.provider,
});

// ---------- Generic Supabase-backed list hook ----------
function useSupabaseList<T extends { id: string }, Row>(
  table: "lessons" | "worksheets" | "channels" | "summaries" | "courses",
  fromRow: (r: Row) => T,
  toInsert: (t: T) => Record<string, unknown>,
) {
  const [items, setItems] = useState<T[]>([]);

  const refresh = async () => {
    const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
    if (error) { console.error(`[${table}] load`, error); return; }
    setItems((data as Row[]).map(fromRow));
  };

  useEffect(() => {
    refresh();
    const channelName = `realtime:${table}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => { refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Diff next vs current; insert added, update changed, delete removed.
  const save = async (next: T[]) => {
    const prev = items;
    const prevMap = new Map(prev.map((x) => [x.id, x]));
    const nextMap = new Map(next.map((x) => [x.id, x]));

    const toAdd: T[] = [];
    const toUpdate: T[] = [];
    for (const item of next) {
      const old = prevMap.get(item.id);
      if (!old) toAdd.push(item);
      else if (JSON.stringify(old) !== JSON.stringify(item)) toUpdate.push(item);
    }
    const toDelete = prev.filter((x) => !nextMap.has(x.id)).map((x) => x.id);

    setItems(next); // optimistic

    try {
      if (toAdd.length) {
        const { error } = await supabase.from(table).insert(toAdd.map(toInsert) as never);
        if (error) throw error;
      }
      for (const item of toUpdate) {
        const { error } = await supabase.from(table).update(toInsert(item) as never).eq("id", item.id);
        if (error) throw error;
      }
      if (toDelete.length) {
        const { error } = await supabase.from(table).delete().in("id", toDelete);
        if (error) throw error;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`فشل الحفظ: ${msg}`);
      refresh(); // revert from server
    }
  };

  return { items, save };
}

export function useLessons() {
  return useSupabaseList<Lesson, LessonRow>("lessons", lessonFromRow, lessonToInsert);
}
export function useWorksheets() {
  return useSupabaseList<WorksheetLink, WsRow>("worksheets", wsFromRow, wsToInsert);
}
export function useChannels() {
  return useSupabaseList<ChannelLink, ChRow>("channels", chFromRow, chToInsert);
}

// ---------- Summaries ----------
export type Summary = {
  id: string; gradeId: number; subject: string; title: string;
  content: string; fileUrl?: string; thumbnailUrl?: string;
};
type SumRow = { id: string; grade_id: number; subject: string; title: string; content: string; file_url: string | null; thumbnail_url: string | null };
const sumFromRow = (r: SumRow): Summary => ({
  id: r.id, gradeId: r.grade_id, subject: r.subject, title: r.title,
  content: r.content, fileUrl: r.file_url ?? undefined, thumbnailUrl: r.thumbnail_url ?? undefined,
});
const sumToInsert = (s: Summary) => ({
  id: s.id, grade_id: s.gradeId, subject: s.subject, title: s.title,
  content: s.content, file_url: s.fileUrl ?? null, thumbnail_url: s.thumbnailUrl ?? null,
});
export function useSummaries() {
  return useSupabaseList<Summary, SumRow>("summaries", sumFromRow, sumToInsert);
}

// ---------- Courses ----------
export type Course = {
  id: string; title: string; description: string; subject: string;
  gradeId?: number; videoUrl?: string; thumbnailUrl?: string;
};
type CourseRow = { id: string; title: string; description: string; subject: string; grade_id: number | null; video_url: string | null; thumbnail_url: string | null };
const courseFromRow = (r: CourseRow): Course => ({
  id: r.id, title: r.title, description: r.description, subject: r.subject,
  gradeId: r.grade_id ?? undefined, videoUrl: r.video_url ?? undefined, thumbnailUrl: r.thumbnail_url ?? undefined,
});
const courseToInsert = (c: Course) => ({
  id: c.id, title: c.title, description: c.description, subject: c.subject,
  grade_id: c.gradeId ?? null, video_url: c.videoUrl ?? null, thumbnail_url: c.thumbnailUrl ?? null,
});
export function useCourses() {
  return useSupabaseList<Course, CourseRow>("courses", courseFromRow, courseToInsert);
}

// ---------- Quotes (CMS via site_settings.quotes) ----------
export function useQuotes() {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "quotes").maybeSingle();
    const arr = Array.isArray(data?.value) ? (data.value as string[]) : [];
    setItems(arr);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const channelName = `realtime:site_settings_quotes:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings", filter: "key=eq.quotes" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const save = async (next: string[]) => {
    const prev = items;
    setItems(next);
    const { error } = await supabase.from("site_settings").upsert({ key: "quotes", value: next as unknown as never, updated_at: new Date().toISOString() });
    if (error) {
      toast.error(`فشل حفظ الاقتباسات: ${error.message}`);
      setItems(prev);
    }
  };

  return { items, loading, save };
}

// ---------- Auth helper (kept for compatibility) ----------
const AUTH_KEY = "manara.auth.v1";
function readBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as boolean) : fallback; } catch { return fallback; }
}
function writeBool(key: string, v: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent(`storage:${key}`));
}
export function useAdminAuth() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(readBool(AUTH_KEY, false));
    const fn = () => setAuthed(readBool(AUTH_KEY, false));
    window.addEventListener(`storage:${AUTH_KEY}`, fn);
    return () => window.removeEventListener(`storage:${AUTH_KEY}`, fn);
  }, []);
  return { authed, login: () => writeBool(AUTH_KEY, true), logout: () => writeBool(AUTH_KEY, false) };
}

// ----- Moderator requests (legacy local cache, real data lives in DB) -----
export type ModRequest = {
  id: string; name: string; email: string; reason: string;
  status: "pending" | "approved" | "rejected"; createdAt: number;
};
export const SUPER_ADMIN_EMAIL = "qlal123a@gmail.com";
export function useModRequests() {
  const [items, setItems] = useState<ModRequest[]>([]);
  return { items, save: setItems };
}

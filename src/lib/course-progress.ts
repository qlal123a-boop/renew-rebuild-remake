import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "./use-auth";
import { toast } from "sonner";

export type CourseLessonRow = {
  lesson_id: string;
  position: number;
  lesson: {
    id: string;
    title: string;
    description: string;
    video_url: string;
  } | null;
};

export function useCourseLessons(courseId: string | undefined) {
  const [lessons, setLessons] = useState<Array<{ id: string; title: string; description: string; video_url: string; position: number }>>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!courseId) { setLessons([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("course_lessons")
      .select("lesson_id, position, lessons:lesson_id (id, title, description, video_url)")
      .eq("course_id", courseId)
      .order("position", { ascending: true });
    if (!error && data) {
      const rows = (data as unknown as Array<{ lesson_id: string; position: number; lessons: { id: string; title: string; description: string; video_url: string } | null }>);
      setLessons(rows.filter(r => r.lessons).map(r => ({ ...r.lessons!, position: r.position })));
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { lessons, loading, refresh };
}

export function useCourseProgress(courseId: string | undefined) {
  const { user } = useAuthUser();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [theme, setTheme] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !courseId) { setDone(new Set()); return; }
    const [{ data: prog }, { data: comp }] = await Promise.all([
      supabase.from("course_progress").select("lesson_id").eq("user_id", user.id).eq("course_id", courseId),
      supabase.from("course_completions").select("completed_at, certificate_theme").eq("user_id", user.id).eq("course_id", courseId).maybeSingle(),
    ]);
    setDone(new Set((prog || []).map((r: { lesson_id: string }) => r.lesson_id)));
    setCompletedAt(comp?.completed_at ?? null);
    setTheme(comp?.certificate_theme ?? null);
  }, [user, courseId]);

  useEffect(() => { refresh(); }, [refresh]);

  const markDone = useCallback(async (lessonId: string) => {
    if (!user || !courseId) { toast.error("سجّل دخولك لحفظ تقدّمك"); return; }
    if (done.has(lessonId)) return;
    const { error } = await supabase.from("course_progress").upsert(
      { user_id: user.id, course_id: courseId, lesson_id: lessonId },
      { onConflict: "user_id,course_id,lesson_id" },
    );
    if (error) { toast.error("تعذّر حفظ التقدّم"); return; }
    setDone((prev) => new Set(prev).add(lessonId));
    // Reward: +5 points per lesson watched (idempotent via unique ref hint)
    try {
      await supabase.from("points_ledger" as never).insert({
        user_id: user.id, delta: 5, reason: "lesson_watched", ref: lessonId,
      } as never);
      toast.success("+5 نقاط 🎉");
    } catch { /* ignore reward failure */ }
  }, [user, courseId, done]);

  const completeCourse = useCallback(async (chosenTheme: string) => {
    if (!user || !courseId) { toast.error("سجّل دخولك أولًا"); return null; }
    const now = new Date().toISOString();
    const { error } = await supabase.from("course_completions").upsert(
      { user_id: user.id, course_id: courseId, certificate_theme: chosenTheme, completed_at: now },
      { onConflict: "user_id,course_id" },
    );
    if (error) { toast.error(error.message); return null; }
    setCompletedAt(now);
    setTheme(chosenTheme);
    return { completed_at: now, certificate_theme: chosenTheme };
  }, [user, courseId]);

  return { done, completedAt, theme, markDone, completeCourse, refresh, user };
}

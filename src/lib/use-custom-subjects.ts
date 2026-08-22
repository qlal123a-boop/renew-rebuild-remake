import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subjectsForGrade as defaultSubjectsForGrade } from "@/lib/curriculum";

export type CustomSubject = { id: string; grade_id: number; name: string };

/** Hook: fetches custom subjects and exposes CRUD + a merged subjectsForGrade(). */
export function useCustomSubjects() {
  const [items, setItems] = useState<CustomSubject[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("custom_subjects")
      .select("id,grade_id,name")
      .order("grade_id");
    setItems((data as CustomSubject[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const add = async (grade_id: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return { error: "اسم المادة فارغ" };
    const { error } = await supabase.from("custom_subjects").insert({ grade_id, name: trimmed });
    if (!error) await reload();
    return { error: error?.message ?? null };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("custom_subjects").delete().eq("id", id);
    if (!error) await reload();
    return { error: error?.message ?? null };
  };

  const subjectsForGrade = (gradeId: number): string[] => {
    const def = defaultSubjectsForGrade(gradeId);
    const extra = items.filter(i => i.grade_id === gradeId).map(i => i.name);
    return Array.from(new Set([...def, ...extra]));
  };

  return { items, loading, add, remove, reload, subjectsForGrade };
}

/** Fire-and-forget read for non-admin pages that just need merged subjects. */
export function useMergedSubjects(gradeId: number) {
  const [subjects, setSubjects] = useState<string[]>(() => defaultSubjectsForGrade(gradeId));
  useEffect(() => {
    let cancelled = false;
    supabase.from("custom_subjects").select("name").eq("grade_id", gradeId)
      .then(({ data }) => {
        if (cancelled) return;
        const extra = (data || []).map((r: { name: string }) => r.name);
        setSubjects(Array.from(new Set([...defaultSubjectsForGrade(gradeId), ...extra])));
      });
    return () => { cancelled = true; };
  }, [gradeId]);
  return subjects;
}

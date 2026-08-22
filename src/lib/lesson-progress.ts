import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "./use-auth";
import { toast } from "sonner";

export function useLessonProgress() {
  const { user } = useAuthUser();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCompleted(new Set());
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("user_id", user.id)
      .eq("completed", true);
    if (!error && data) {
      setCompleted(new Set(data.map((r: { lesson_id: string }) => r.lesson_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (lessonId: string) => {
      if (!user) {
        toast.error("سجّل دخولك لحفظ تقدّمك");
        return;
      }
      const isDone = completed.has(lessonId);
      if (isDone) {
        const { error } = await supabase
          .from("lesson_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);
        if (error) {
          toast.error("تعذّر التحديث");
          return;
        }
        const next = new Set(completed);
        next.delete(lessonId);
        setCompleted(next);
        toast.success("أُلغي وضع الإنجاز");
      } else {
        const { error } = await supabase
          .from("lesson_progress")
          .upsert(
            { user_id: user.id, lesson_id: lessonId, completed: true },
            { onConflict: "user_id,lesson_id" }
          );
        if (error) {
          toast.error("تعذّر التحديث");
          return;
        }
        const next = new Set(completed);
        next.add(lessonId);
        setCompleted(next);
        toast.success("أحسنت! تم وضع الدرس كمُنجَز");
      }
    },
    [user, completed]
  );

  return { completed, loading, toggle, isCompleted: (id: string) => completed.has(id) };
}

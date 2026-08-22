
-- 1. course_lessons (mapping)
CREATE TABLE public.course_lessons (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, lesson_id)
);
GRANT SELECT ON public.course_lessons TO anon, authenticated;
GRANT ALL ON public.course_lessons TO service_role;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_lessons_read" ON public.course_lessons FOR SELECT USING (true);
CREATE POLICY "course_lessons_admin_write" ON public.course_lessons FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 2. course_progress
CREATE TABLE public.course_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_progress TO authenticated;
GRANT ALL ON public.course_progress TO service_role;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_progress_own_select" ON public.course_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "course_progress_own_insert" ON public.course_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "course_progress_own_delete" ON public.course_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. course_completions
CREATE TABLE public.course_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  certificate_theme text,
  PRIMARY KEY (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE ON public.course_completions TO authenticated;
GRANT ALL ON public.course_completions TO service_role;
ALTER TABLE public.course_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_completions_own_select" ON public.course_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "course_completions_own_insert" ON public.course_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "course_completions_own_update" ON public.course_completions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. courses extension
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS auto_certificate_theme boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS certificate_theme text;

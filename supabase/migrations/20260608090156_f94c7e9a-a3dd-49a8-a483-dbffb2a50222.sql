
CREATE TABLE IF NOT EXISTS public.custom_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id int NOT NULL CHECK (grade_id BETWEEN 1 AND 12),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grade_id, name)
);

GRANT SELECT ON public.custom_subjects TO anon, authenticated;
GRANT ALL ON public.custom_subjects TO service_role;

ALTER TABLE public.custom_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_subjects readable by everyone"
  ON public.custom_subjects FOR SELECT
  USING (true);

CREATE POLICY "super admin manages custom_subjects"
  ON public.custom_subjects FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- Super admin checker (email-based)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() ->> 'email') = 'qlal123a@gmail.com', false);
$$;

-- ===== Tables =====
CREATE TABLE IF NOT EXISTS public.moderator_requests (
  id bigserial PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  goal text,
  status text DEFAULT 'pending',
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_admins (
  id bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  role text DEFAULT 'moderator',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id int NOT NULL,
  subject text NOT NULL,
  semester int NOT NULL CHECK (semester IN (1,2)),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  worksheet_url text,
  worksheet_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lessons_lookup ON public.lessons (grade_id, subject, semester);

CREATE TABLE IF NOT EXISTS public.worksheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id int NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_worksheets_lookup ON public.worksheets (grade_id, subject);

CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  provider text NOT NULL DEFAULT 'YouTube',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id integer NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  file_url text,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  subject text NOT NULL,
  grade_id integer,
  video_url text,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  lesson_topic text NOT NULL,
  score int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== RLS =====
ALTER TABLE public.moderator_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mod_insert_own" ON public.moderator_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mod_select_own_or_admin" ON public.moderator_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_super_admin());
CREATE POLICY "mod_update_admin" ON public.moderator_requests
  FOR UPDATE TO authenticated USING (public.is_super_admin());
CREATE POLICY "mod_delete_admin" ON public.moderator_requests
  FOR DELETE TO authenticated USING (public.is_super_admin());

CREATE POLICY "admins_select_authed" ON public.site_admins
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins_write_super" ON public.site_admins
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "settings_select_all" ON public.site_settings
  FOR SELECT USING (true);
CREATE POLICY "settings_write_super" ON public.site_settings
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "lessons_public_read" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "lessons_admin_write" ON public.lessons FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "worksheets_public_read" ON public.worksheets FOR SELECT USING (true);
CREATE POLICY "worksheets_admin_write" ON public.worksheets FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "channels_public_read" ON public.channels FOR SELECT USING (true);
CREATE POLICY "channels_admin_write" ON public.channels FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "summaries_public_read" ON public.summaries FOR SELECT USING (true);
CREATE POLICY "summaries_admin_write" ON public.summaries FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (true);
CREATE POLICY "courses_admin_write" ON public.courses FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "quiz_insert_any" ON public.quiz_attempts
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "quiz_select_own_or_admin" ON public.quiz_attempts
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR public.is_super_admin()
  );

-- ===== Storage =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('worksheets', 'worksheets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "worksheets_public_read_obj" ON storage.objects
  FOR SELECT USING (bucket_id = 'worksheets');
CREATE POLICY "worksheets_admin_insert_obj" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'worksheets' AND public.is_super_admin());
CREATE POLICY "worksheets_admin_update_obj" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'worksheets' AND public.is_super_admin());
CREATE POLICY "worksheets_admin_delete_obj" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'worksheets' AND public.is_super_admin());

-- ===== Realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.worksheets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.summaries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;

-- ===== Visitor counter =====
CREATE OR REPLACE FUNCTION public.increment_visitor_count()
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_count bigint;
BEGIN
  INSERT INTO public.site_settings(key, value)
  VALUES ('visitor_count', '0'::jsonb)
  ON CONFLICT (key) DO NOTHING;

  UPDATE public.site_settings
  SET value = to_jsonb(((value)::text)::bigint + 1),
      updated_at = now()
  WHERE key = 'visitor_count'
  RETURNING ((value)::text)::bigint INTO new_count;

  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_visitor_count() TO anon, authenticated;

-- ===== Seeds (zero default quotes per user request) =====
INSERT INTO public.site_settings (key, value) VALUES
  ('quotes', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value) VALUES
  ('visitor_count', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;

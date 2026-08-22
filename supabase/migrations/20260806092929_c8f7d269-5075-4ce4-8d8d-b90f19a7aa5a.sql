
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() ->> 'email') = 'qlal123a@gmail.com', false);
$$;

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

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moderator_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.moderator_requests_id_seq TO authenticated;
GRANT ALL ON public.moderator_requests TO service_role;
GRANT ALL ON SEQUENCE public.moderator_requests_id_seq TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_admins TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.site_admins_id_seq TO authenticated;
GRANT ALL ON public.site_admins TO service_role;
GRANT ALL ON SEQUENCE public.site_admins_id_seq TO service_role;
GRANT SELECT ON public.lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
GRANT SELECT ON public.worksheets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worksheets TO authenticated;
GRANT ALL ON public.worksheets TO service_role;
GRANT SELECT ON public.channels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;
GRANT ALL ON public.channels TO service_role;
GRANT SELECT ON public.summaries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.summaries TO authenticated;
GRANT ALL ON public.summaries TO service_role;
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;

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

CREATE POLICY "quiz_select_own_or_admin" ON public.quiz_attempts
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR public.is_super_admin()
  );

CREATE POLICY "worksheets_public_read_obj" ON storage.objects
  FOR SELECT USING (bucket_id = 'worksheets');
CREATE POLICY "worksheets_admin_insert_obj" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'worksheets' AND public.is_super_admin());
CREATE POLICY "worksheets_admin_update_obj" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'worksheets' AND public.is_super_admin());
CREATE POLICY "worksheets_admin_delete_obj" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'worksheets' AND public.is_super_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.worksheets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.summaries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;

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

INSERT INTO public.site_settings (key, value) VALUES ('quotes', '[]'::jsonb) ON CONFLICT (key) DO NOTHING;
INSERT INTO public.site_settings (key, value) VALUES ('visitor_count', '0'::jsonb) ON CONFLICT (key) DO NOTHING;
INSERT INTO public.site_settings (key, value) VALUES ('quranic_verses', '[]'::jsonb) ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_registered_user_count()
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c bigint;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT COUNT(*) INTO c FROM auth.users;
  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_registered_users()
RETURNS TABLE(id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY user_roles_self_read ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin());

CREATE POLICY user_roles_admin_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.list_users_with_roles()
RETURNS TABLE(id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, roles public.app_role[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at,
           COALESCE(ARRAY_AGG(r.role) FILTER (WHERE r.role IS NOT NULL), ARRAY[]::public.app_role[]) AS roles
    FROM auth.users u
    LEFT JOIN public.user_roles r ON r.user_id = u.id
    GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at
    ORDER BY u.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.set_user_role(_target uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _target;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target, _role);
END; $$;

CREATE OR REPLACE FUNCTION public.remove_user_role(_target uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _target AND role = _role;
END; $$;

CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_select_own_or_admin" ON public.lesson_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin());
CREATE POLICY "progress_insert_own" ON public.lesson_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_update_own" ON public.lesson_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_delete_own" ON public.lesson_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY admins_select_super ON public.site_admins
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY quiz_insert_own ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.list_users_with_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_user_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_registered_user_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_registered_users() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_registered_user_count() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.list_registered_users() TO service_role, authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_visitor_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_visitor_count() TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE TABLE public.course_lessons (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, lesson_id)
);
GRANT SELECT ON public.course_lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;
GRANT ALL ON public.course_lessons TO service_role;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_lessons_read" ON public.course_lessons FOR SELECT USING (true);
CREATE POLICY "course_lessons_admin_write" ON public.course_lessons FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

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

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS auto_certificate_theme boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS certificate_theme text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS pass_threshold int NOT NULL DEFAULT 50;

ALTER TABLE public.course_completions
  ADD COLUMN IF NOT EXISTS final_exam_score int,
  ADD COLUMN IF NOT EXISTS final_exam_total int,
  ADD COLUMN IF NOT EXISTS student_name text;

CREATE TABLE IF NOT EXISTS public.custom_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id int NOT NULL CHECK (grade_id BETWEEN 1 AND 12),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grade_id, name)
);

GRANT SELECT ON public.custom_subjects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_subjects TO authenticated;
GRANT ALL ON public.custom_subjects TO service_role;

ALTER TABLE public.custom_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_subjects readable by everyone"
  ON public.custom_subjects FOR SELECT USING (true);
CREATE POLICY "super admin manages custom_subjects"
  ON public.custom_subjects FOR ALL
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.library_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('textbook','reading')),
  grade_id INT CHECK (grade_id BETWEEN 1 AND 12),
  subject TEXT,
  pdf_url TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.library_books TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_books TO authenticated;
GRANT ALL ON public.library_books TO service_role;

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "library_books read all" ON public.library_books FOR SELECT USING (true);
CREATE POLICY "library_books super admin write" ON public.library_books FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_library_books_updated_at BEFORE UPDATE ON public.library_books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_points_ledger_user ON public.points_ledger(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.points_ledger TO authenticated;
GRANT ALL ON public.points_ledger TO service_role;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read points" ON public.points_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert points" ON public.points_ledger FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND delta > 0 AND delta <= 100);

CREATE TABLE public.store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  kind text NOT NULL CHECK (kind IN ('avatar','wallpaper','book','badge')),
  image_url text,
  payload_url text,
  price integer NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_items TO authenticated;
GRANT ALL ON public.store_items TO service_role;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read store" ON public.store_items FOR SELECT USING (active = true);
CREATE POLICY "admin manage store" ON public.store_items FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  price_paid integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT, INSERT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read purchases" ON public.purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game text NOT NULL,
  score integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_game_scores_top ON public.game_scores(game, score DESC);
GRANT SELECT, INSERT ON public.game_scores TO authenticated;
GRANT SELECT ON public.game_scores TO anon;
GRANT ALL ON public.game_scores TO service_role;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public leaderboard" ON public.game_scores FOR SELECT USING (true);
CREATE POLICY "own insert score" ON public.game_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_user_points(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(delta), 0)::int FROM public.points_ledger WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.redeem_store_item(_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_price integer;
  v_active boolean;
  v_balance integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT price, active INTO v_price, v_active FROM public.store_items WHERE id = _item_id;
  IF v_price IS NULL OR NOT v_active THEN RAISE EXCEPTION 'item unavailable'; END IF;
  IF EXISTS (SELECT 1 FROM public.purchases WHERE user_id = v_user AND item_id = _item_id) THEN
    RAISE EXCEPTION 'already owned';
  END IF;
  v_balance := public.get_user_points(v_user);
  IF v_balance < v_price THEN RAISE EXCEPTION 'insufficient points'; END IF;
  INSERT INTO public.purchases(user_id, item_id, price_paid) VALUES (v_user, _item_id, v_price);
  INSERT INTO public.points_ledger(user_id, delta, reason, ref) VALUES (v_user, -v_price, 'purchase', _item_id::text);
  RETURN jsonb_build_object('ok', true, 'balance', public.get_user_points(v_user));
END; $$;

CREATE TRIGGER trg_store_items_updated BEFORE UPDATE ON public.store_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT EXECUTE ON FUNCTION public.get_user_points(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_store_item(uuid) TO authenticated, service_role;

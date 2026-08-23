CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

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
CREATE POLICY "custom_subjects readable by everyone" ON public.custom_subjects FOR SELECT USING (true);
CREATE POLICY "super admin manages custom_subjects" ON public.custom_subjects FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.library_books (
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
GRANT SELECT ON public.store_items TO anon, authenticated;
GRANT ALL ON public.store_items TO service_role;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read store" ON public.store_items FOR SELECT USING (active = true);
CREATE POLICY "admin manage store" ON public.store_items FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE TRIGGER trg_store_items_updated BEFORE UPDATE ON public.store_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

CREATE POLICY "store_read_all" ON storage.objects FOR SELECT USING (bucket_id = 'store');
CREATE POLICY "store_admin_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store' AND public.is_super_admin());
CREATE POLICY "store_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'store' AND public.is_super_admin()) WITH CHECK (bucket_id = 'store' AND public.is_super_admin());
CREATE POLICY "store_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'store' AND public.is_super_admin());
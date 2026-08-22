
-- Gamification: points ledger, store items, purchases, game scores, video watch rewards

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

-- Helper: get current point balance
CREATE OR REPLACE FUNCTION public.get_user_points(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(delta), 0)::int FROM public.points_ledger WHERE user_id = _user_id;
$$;

-- Redeem a store item atomically (checks balance, records purchase + negative ledger entry)
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

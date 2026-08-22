-- Quranic verses storage in site_settings (admin-managed list)
INSERT INTO public.site_settings (key, value)
VALUES ('quranic_verses', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Admin-only RPC: total registered users count
CREATE OR REPLACE FUNCTION public.get_registered_user_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.get_registered_user_count() TO authenticated;
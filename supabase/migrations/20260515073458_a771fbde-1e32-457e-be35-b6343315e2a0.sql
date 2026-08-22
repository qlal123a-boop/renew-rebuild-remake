CREATE OR REPLACE FUNCTION public.list_registered_users()
RETURNS TABLE(id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

REVOKE ALL ON FUNCTION public.list_registered_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_registered_users() TO authenticated;
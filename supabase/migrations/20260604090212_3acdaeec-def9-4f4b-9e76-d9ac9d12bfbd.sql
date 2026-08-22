GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
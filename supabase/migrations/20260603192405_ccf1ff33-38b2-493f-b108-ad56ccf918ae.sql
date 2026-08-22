-- 1. Restrict site_admins SELECT to super admin only
DROP POLICY IF EXISTS admins_select_authed ON public.site_admins;
CREATE POLICY admins_select_super ON public.site_admins
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 2. Tighten quiz_attempts INSERT
DROP POLICY IF EXISTS quiz_insert_any ON public.quiz_attempts;
CREATE POLICY quiz_insert_own ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Storage: drop broad listing on worksheets bucket.
-- Files remain accessible via direct public URL (public bucket),
-- but listing/enumeration via the storage API is blocked.
DROP POLICY IF EXISTS worksheets_public_read_obj ON storage.objects;

-- 4. Lock down SECURITY DEFINER functions from direct RPC calls.
-- They still execute inside RLS policies (definer rights apply regardless).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_users_with_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_user_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_registered_user_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_registered_users() FROM PUBLIC, anon, authenticated;

-- Admin RPCs: only service role can invoke directly (server-side code paths).
GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_registered_user_count() TO service_role;
GRANT EXECUTE ON FUNCTION public.list_registered_users() TO service_role;

-- increment_visitor_count is intentionally callable by visitors (anon + authenticated)
-- so the homepage counter works. Re-grant explicitly after the global revoke noise.
REVOKE EXECUTE ON FUNCTION public.increment_visitor_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_visitor_count() TO anon, authenticated, service_role;
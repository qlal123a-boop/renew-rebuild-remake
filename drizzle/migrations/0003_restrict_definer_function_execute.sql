-- Trigger helper: never callable through the API
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated;

-- Admin-only / user-scoped helpers: not callable by anonymous visitors
REVOKE ALL ON FUNCTION public.get_registered_user_count() FROM anon;
REVOKE ALL ON FUNCTION public.list_registered_users() FROM anon;
REVOKE ALL ON FUNCTION public.list_users_with_roles() FROM anon;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.remove_user_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.redeem_store_item(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_points(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- Keep the calls the app actually needs
GRANT EXECUTE ON FUNCTION public.increment_visitor_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_store_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_registered_user_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_registered_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid, public.app_role) TO authenticated;
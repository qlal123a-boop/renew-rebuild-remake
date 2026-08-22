-- 1. Enum for roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. has_role security definer (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- 4. RLS policies
DROP POLICY IF EXISTS user_roles_self_read ON public.user_roles;
CREATE POLICY user_roles_self_read ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin());

DROP POLICY IF EXISTS user_roles_admin_write ON public.user_roles;
CREATE POLICY user_roles_admin_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 5. List users with roles (super admin only)
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

-- 6. Set role (super admin only) — replaces existing role set
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
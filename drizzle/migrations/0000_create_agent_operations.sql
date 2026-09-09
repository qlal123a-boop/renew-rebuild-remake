CREATE TABLE public.agent_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  dangerous boolean NOT NULL DEFAULT false,
  branch text,
  pr_number integer,
  pr_url text,
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_operations TO authenticated;
GRANT ALL ON public.agent_operations TO service_role;

ALTER TABLE public.agent_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_ops_super_admin_all ON public.agent_operations
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_agent_operations_updated
  BEFORE UPDATE ON public.agent_operations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_agent_operations_created ON public.agent_operations (created_at DESC);

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

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS pass_threshold integer NOT NULL DEFAULT 60;

ALTER TABLE public.course_completions
  ADD COLUMN IF NOT EXISTS final_exam_score integer,
  ADD COLUMN IF NOT EXISTS student_name text;
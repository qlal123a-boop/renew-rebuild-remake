
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS pass_threshold int NOT NULL DEFAULT 50;

ALTER TABLE public.course_completions
  ADD COLUMN IF NOT EXISTS final_exam_score int,
  ADD COLUMN IF NOT EXISTS final_exam_total int,
  ADD COLUMN IF NOT EXISTS student_name text;

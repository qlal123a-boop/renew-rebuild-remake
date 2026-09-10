ALTER TABLE public.course_completions
  ADD COLUMN IF NOT EXISTS final_exam_total integer;
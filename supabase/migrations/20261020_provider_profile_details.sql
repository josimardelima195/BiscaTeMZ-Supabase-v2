ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS services_offered text,
  ADD COLUMN IF NOT EXISTS working_hours text,
  ADD COLUMN IF NOT EXISTS availability_note text;

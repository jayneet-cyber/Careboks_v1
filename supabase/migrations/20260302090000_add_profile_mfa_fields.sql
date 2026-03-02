ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mfa_enforced_every_login boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_enrolled_at timestamptz;
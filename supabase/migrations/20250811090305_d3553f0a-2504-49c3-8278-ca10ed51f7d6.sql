-- Drop the old 3-parameter invite_user function to resolve conflict
DROP FUNCTION IF EXISTS public.invite_user(uuid, text, text);

-- Keep only the 4-parameter version with p_expires_at
-- Fix 1: Replace overly permissive profile_boosts SELECT policy
-- Only expose active (non-expired) boosts publicly, not historical data
DROP POLICY IF EXISTS "Anyone can read active boosts" ON public.profile_boosts;

CREATE POLICY "Anyone can read active boosts"
ON public.profile_boosts
FOR SELECT
TO public
USING (expires_at >= now());

-- Fix 2: Restrict user_active_conversations SELECT to own row
DROP POLICY IF EXISTS "Authenticated users can read active conversations" ON public.user_active_conversations;

CREATE POLICY "Users can read own active conversation"
ON public.user_active_conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
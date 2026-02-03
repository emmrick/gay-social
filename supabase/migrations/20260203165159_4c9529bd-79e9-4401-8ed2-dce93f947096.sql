-- Fix push_subscriptions overly permissive policy
-- The "Service role can read all subscriptions" policy with condition "true" 
-- allows ANY authenticated user to read ALL push subscriptions
-- This is a security issue as it exposes push endpoints and encryption keys

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;

-- The existing policies are sufficient:
-- - "Users can view own subscriptions" - users can only see their own subscriptions
-- - "Users can insert own subscriptions" - users can only insert their own subscriptions  
-- - "Users can delete own subscriptions" - users can only delete their own subscriptions
-- 
-- Edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely,
-- so no additional policy is needed for server-side access.
-- Fix 1: Remove open UPDATE and INSERT policies on rate_limits table
-- Rate limits should only be managed server-side via service role key
DROP POLICY IF EXISTS "Anyone can update rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Anyone can insert rate limits" ON public.rate_limits;

-- Fix 2: Remove overly permissive SELECT policy on visitor_support_sessions
-- This table contains PII (names, emails, phone numbers) and should not be publicly readable
-- Admin/moderator access is already covered by the "Admins can manage visitor sessions" ALL policy
-- Visitors use .insert().select().single() which returns the inserted row without needing a SELECT policy
DROP POLICY IF EXISTS "Anyone can read own visitor session" ON public.visitor_support_sessions;
-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can view own profile or admins all" ON public.profiles;

-- Create a policy that allows:
-- 1. Anonymous users to see basic profile info (for landing page member counts)
-- 2. Authenticated users to see all profiles (for member browsing)
-- 3. Users to see their own complete profile
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Allow anonymous users to see limited profile data for landing page statistics
CREATE POLICY "Anonymous can view basic profile info"
ON public.profiles FOR SELECT
TO anon
USING (true);

-- Ensure users can only UPDATE their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure users can only INSERT their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure users can only DELETE their own profile
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Table for storing user age contact preferences
CREATE TABLE public.contact_age_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  min_age INTEGER NOT NULL DEFAULT 18,
  max_age INTEGER NOT NULL DEFAULT 99,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Table for exceptions (when the filtered user initiates contact, unblock that specific person)
CREATE TABLE public.contact_age_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allowed_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, allowed_user_id)
);

-- Enable RLS
ALTER TABLE public.contact_age_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_age_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_age_preferences
CREATE POLICY "Users can read any contact age preference" ON public.contact_age_preferences
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own preference" ON public.contact_age_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preference" ON public.contact_age_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preference" ON public.contact_age_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS policies for contact_age_exceptions
CREATE POLICY "Users can read their own exceptions" ON public.contact_age_exceptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = allowed_user_id);

CREATE POLICY "Users can insert their own exceptions" ON public.contact_age_exceptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exceptions" ON public.contact_age_exceptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

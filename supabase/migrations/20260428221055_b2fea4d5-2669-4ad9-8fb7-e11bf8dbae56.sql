-- 1. Add columns
ALTER TABLE public.henry_conversations
  ADD COLUMN IF NOT EXISTS rejected_reasons jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS setup_completed boolean NOT NULL DEFAULT false;

-- 2. Function to record a rejection reason (increments counter)
CREATE OR REPLACE FUNCTION public.henry_record_reject_reason(_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current jsonb;
  v_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _reason IS NULL OR length(_reason) = 0 THEN
    RETURN;
  END IF;

  SELECT rejected_reasons INTO v_current
  FROM public.henry_conversations
  WHERE user_id = v_user_id;

  IF v_current IS NULL THEN
    v_current := '{}'::jsonb;
  END IF;

  v_count := COALESCE((v_current ->> _reason)::int, 0) + 1;
  v_current := v_current || jsonb_build_object(_reason, v_count);

  UPDATE public.henry_conversations
  SET rejected_reasons = v_current,
      updated_at = now()
  WHERE user_id = v_user_id;
END;
$$;

-- 3. Patch henry_update_criteria to accept setup_completed flag
-- (we DROP and recreate to add the new optional parameter)
DROP FUNCTION IF EXISTS public.henry_update_criteria(
  text, integer, integer, text, text[], text[], text,
  integer, integer, text[], text[], text, text
);

CREATE OR REPLACE FUNCTION public.henry_update_criteria(
  _relationship_goal text DEFAULT NULL,
  _age_min integer DEFAULT NULL,
  _age_max integer DEFAULT NULL,
  _region text DEFAULT NULL,
  _tribes text[] DEFAULT NULL,
  _interests text[] DEFAULT NULL,
  _current_step text DEFAULT NULL,
  _height_min integer DEFAULT NULL,
  _height_max integer DEFAULT NULL,
  _languages text[] DEFAULT NULL,
  _availability text[] DEFAULT NULL,
  _free_note_step text DEFAULT NULL,
  _free_note_text text DEFAULT NULL,
  _setup_completed boolean DEFAULT NULL
)
RETURNS public.henry_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.henry_conversations;
  v_notes jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure conversation exists
  INSERT INTO public.henry_conversations (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT free_notes INTO v_notes FROM public.henry_conversations WHERE user_id = v_user_id;
  IF v_notes IS NULL THEN v_notes := '{}'::jsonb; END IF;

  IF _free_note_step IS NOT NULL AND _free_note_text IS NOT NULL THEN
    v_notes := v_notes || jsonb_build_object(_free_note_step, _free_note_text);
  END IF;

  UPDATE public.henry_conversations
  SET
    relationship_goal = COALESCE(_relationship_goal, relationship_goal),
    age_min = COALESCE(_age_min, age_min),
    age_max = COALESCE(_age_max, age_max),
    region = CASE WHEN _region IS NOT NULL OR _region = '' THEN _region ELSE region END,
    tribes = COALESCE(_tribes, tribes),
    interests = COALESCE(_interests, interests),
    current_step = COALESCE(_current_step, current_step),
    height_min = COALESCE(_height_min, height_min),
    height_max = COALESCE(_height_max, height_max),
    languages = COALESCE(_languages, languages),
    availability = COALESCE(_availability, availability),
    free_notes = v_notes,
    setup_completed = COALESCE(_setup_completed, setup_completed),
    updated_at = now()
  WHERE user_id = v_user_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
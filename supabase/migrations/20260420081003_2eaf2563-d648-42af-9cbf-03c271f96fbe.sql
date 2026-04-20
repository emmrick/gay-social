
-- 1. Autoriser le type de signalement 'tween' dans la table reports
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_report_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_report_type_check
  CHECK (report_type = ANY (ARRAY['user'::text, 'message'::text, 'group'::text, 'tween'::text]));

-- 2. Ajouter une colonne tween_id pour lier le signalement au Tween concerné
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS tween_id uuid REFERENCES public.tweens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_tween_id ON public.reports(tween_id) WHERE tween_id IS NOT NULL;

-- 3. Ajouter colonnes d'édition sur les tweens
ALTER TABLE public.tweens
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- 4. Politique RLS pour permettre à l'auteur de modifier son propre Tween
DROP POLICY IF EXISTS "Users can update their own tweens" ON public.tweens;
CREATE POLICY "Users can update their own tweens"
  ON public.tweens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Trigger qui génère une mission de modération quand un Tween est signalé
CREATE OR REPLACE FUNCTION public.create_tween_review_mission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tween_owner uuid;
  v_tween_content text;
  v_existing_count int;
BEGIN
  IF NEW.report_type <> 'tween' OR NEW.tween_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Eviter les doublons : ne pas créer de mission si une existe déjà pour ce tween
  SELECT COUNT(*) INTO v_existing_count
  FROM public.moderation_tasks
  WHERE task_type = 'tween_review'
    AND target_entity_id = NEW.tween_id::text
    AND status IN ('pending', 'reserved');

  IF v_existing_count > 0 THEN
    RETURN NEW;
  END IF;

  SELECT user_id, LEFT(content, 120)
    INTO v_tween_owner, v_tween_content
  FROM public.tweens
  WHERE id = NEW.tween_id;

  INSERT INTO public.moderation_tasks (
    task_type,
    target_entity_id,
    target_user_id,
    reward_cents,
    description,
    metadata
  ) VALUES (
    'tween_review',
    NEW.tween_id::text,
    v_tween_owner,
    3,
    COALESCE('Signalement Tween : ' || v_tween_content, 'Signalement d''un Tween'),
    jsonb_build_object(
      'report_id', NEW.id,
      'tween_id', NEW.tween_id,
      'reporter_id', NEW.reporter_id,
      'reason', NEW.reason
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_tween_review_mission ON public.reports;
CREATE TRIGGER trg_create_tween_review_mission
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tween_review_mission();


-- Table : journal de modération des idées
CREATE TABLE IF NOT EXISTS public.suggestion_moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.user_suggestions(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  previous_status text,
  new_status text,
  admin_notes text,
  credits_awarded integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_susp_modlog_suggestion ON public.suggestion_moderation_logs(suggestion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_susp_modlog_actor ON public.suggestion_moderation_logs(actor_id);

ALTER TABLE public.suggestion_moderation_logs ENABLE ROW LEVEL SECURITY;

-- Seuls admins + modérateurs voient le journal
DROP POLICY IF EXISTS "Staff can view suggestion mod logs" ON public.suggestion_moderation_logs;
CREATE POLICY "Staff can view suggestion mod logs"
  ON public.suggestion_moderation_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- Insertion uniquement via trigger SECURITY DEFINER : pas de policy INSERT publique.

-- Fonction trigger : capture chaque changement significatif
CREATE OR REPLACE FUNCTION public.log_suggestion_moderation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(NEW.reviewed_by, auth.uid());
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.suggestion_moderation_logs
      (suggestion_id, actor_id, action, previous_status, new_status, admin_notes, credits_awarded)
    VALUES
      (NEW.id, NEW.user_id, 'created', NULL, NEW.status, NULL, NULL);
    RETURN NEW;
  END IF;

  -- Changement de statut
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_action := NEW.status; -- 'approved', 'rejected', 'in_review', 'implemented', 'pending'
    INSERT INTO public.suggestion_moderation_logs
      (suggestion_id, actor_id, action, previous_status, new_status, admin_notes, credits_awarded)
    VALUES
      (NEW.id, v_actor, v_action, OLD.status, NEW.status, NEW.admin_notes,
       CASE WHEN NEW.status = 'approved' THEN NEW.credits_awarded ELSE NULL END);
    RETURN NEW;
  END IF;

  -- Note interne modifiée sans changement de statut
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    INSERT INTO public.suggestion_moderation_logs
      (suggestion_id, actor_id, action, previous_status, new_status, admin_notes, credits_awarded)
    VALUES
      (NEW.id, v_actor, 'note_updated', OLD.status, NEW.status, NEW.admin_notes, NULL);
  END IF;

  -- Crédits ajustés sans changement de statut
  IF NEW.credits_awarded IS DISTINCT FROM OLD.credits_awarded
     AND NEW.status = OLD.status THEN
    INSERT INTO public.suggestion_moderation_logs
      (suggestion_id, actor_id, action, previous_status, new_status, admin_notes, credits_awarded)
    VALUES
      (NEW.id, v_actor, 'credits_awarded', OLD.status, NEW.status, NEW.admin_notes, NEW.credits_awarded);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_suggestion_moderation ON public.user_suggestions;
CREATE TRIGGER trg_log_suggestion_moderation
AFTER INSERT OR UPDATE ON public.user_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.log_suggestion_moderation_change();

-- Backfill : journalise les idées déjà examinées
INSERT INTO public.suggestion_moderation_logs
  (suggestion_id, actor_id, action, previous_status, new_status, admin_notes, credits_awarded, created_at)
SELECT s.id, s.reviewed_by, s.status, NULL, s.status, s.admin_notes,
       CASE WHEN s.status = 'approved' THEN s.credits_awarded ELSE NULL END,
       COALESCE(s.reviewed_at, s.updated_at, s.created_at)
FROM public.user_suggestions s
WHERE s.reviewed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.suggestion_moderation_logs l
    WHERE l.suggestion_id = s.id AND l.action = s.status
  );

-- Ajouter la colonne attachments à la table des suggestions
ALTER TABLE public.user_suggestions
ADD COLUMN attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Créer le bucket privé pour les pièces jointes
INSERT INTO storage.buckets (id, name, public)
VALUES ('suggestion-attachments', 'suggestion-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies sur storage.objects pour ce bucket
-- Les fichiers sont rangés dans un dossier nommé d'après l'user_id : {user_id}/{filename}

CREATE POLICY "Users can upload their own suggestion attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'suggestion-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own suggestion attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'suggestion-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own suggestion attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'suggestion-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins and moderators can view all suggestion attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'suggestion-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);
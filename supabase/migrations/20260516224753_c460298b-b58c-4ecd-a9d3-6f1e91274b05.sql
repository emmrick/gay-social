-- Public bucket pour les médias du canal d'annonces
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-media', 'announcement-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture publique
CREATE POLICY "Announcement media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-media');

-- Écriture restreinte aux admins/mods
CREATE POLICY "Admins and mods can upload announcement media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'announcement-media'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

CREATE POLICY "Admins and mods can update announcement media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'announcement-media'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

CREATE POLICY "Admins and mods can delete announcement media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcement-media'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);
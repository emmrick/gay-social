-- Create a new private bucket for ephemeral media
-- This separates sensitive ephemeral (disappearing) content from public album content

-- First, create the ephemeral-media bucket as PRIVATE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ephemeral-media', 
  'ephemeral-media', 
  false,  -- PRIVATE bucket
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Create RLS policies for the ephemeral-media bucket

-- Policy: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload ephemeral media to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ephemeral-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view ephemeral media in their own folder (as sender)
CREATE POLICY "Users can view own ephemeral media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ephemeral-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Recipients can view ephemeral media shared with them via messages
-- This allows recipients of private messages to access the media
CREATE POLICY "Recipients can view ephemeral media shared with them"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ephemeral-media' AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.ephemeral_media em ON em.message_id = m.id
    WHERE em.media_url = storage.objects.name
    AND (m.recipient_id = auth.uid() OR m.sender_id = auth.uid())
    AND em.is_viewed = false
    AND (em.expires_at IS NULL OR em.expires_at > now())
  )
);

-- Policy: Users can delete their own ephemeral media
CREATE POLICY "Users can delete own ephemeral media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ephemeral-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
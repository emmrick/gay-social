
-- Fix: Allow recipients to view ephemeral media even after expires_at if not yet viewed
DROP POLICY IF EXISTS "Recipients can view ephemeral media shared with them" ON storage.objects;

CREATE POLICY "Recipients can view ephemeral media shared with them"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ephemeral-media'
  AND EXISTS (
    SELECT 1
    FROM messages m
    JOIN ephemeral_media em ON em.message_id = m.id
    WHERE em.media_url = objects.name
      AND (m.recipient_id = auth.uid() OR m.sender_id = auth.uid())
      AND (
        em.is_viewed = false
        OR em.view_duration = 0
      )
  )
);

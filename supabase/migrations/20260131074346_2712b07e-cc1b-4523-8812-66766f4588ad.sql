
-- Drop the existing message_type check constraint
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Add a new check constraint that includes 'album_share' as a valid message type
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'album_share'));

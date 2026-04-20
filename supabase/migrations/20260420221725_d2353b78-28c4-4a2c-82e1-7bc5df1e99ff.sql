ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check
CHECK (message_type = ANY (ARRAY[
  'text','image','video','audio','file',
  'album_share','album_access_request',
  'credit_request','credit_gift',
  'system_screenshot','system_external_warning'
]));
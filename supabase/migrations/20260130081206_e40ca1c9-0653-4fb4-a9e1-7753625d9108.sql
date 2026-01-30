-- Add soft delete column to messages table
ALTER TABLE public.messages 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add deleted_by column to track who deleted the message
ALTER TABLE public.messages 
ADD COLUMN deleted_by UUID DEFAULT NULL;

-- Create index for faster filtering of non-deleted messages
CREATE INDEX idx_messages_deleted_at ON public.messages(deleted_at) WHERE deleted_at IS NULL;

-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'closed')),
  subject TEXT DEFAULT 'Demande d''assistance',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

-- Users can create their own tickets
CREATE POLICY "Users can create their own tickets"
ON public.support_tickets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin/moderator can update tickets (assign, close)
CREATE POLICY "Admin/moderator can update tickets"
ON public.support_tickets FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR auth.uid() = user_id
);

-- Create support_messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages of their own tickets, admin/mod can view all
CREATE POLICY "View support messages"
ON public.support_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t 
    WHERE t.id = ticket_id 
    AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  )
);

-- Users can send messages to their own tickets, admin/mod to any
CREATE POLICY "Send support messages"
ON public.support_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t 
    WHERE t.id = ticket_id 
    AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- Function to generate 13-digit ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_number TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    -- Generate 13-digit number: timestamp-based prefix + random suffix
    new_number := LPAD(
      (EXTRACT(EPOCH FROM now())::bigint % 10000000)::text || 
      LPAD(floor(random() * 1000000)::text, 6, '0'),
      13, '0'
    );
    SELECT EXISTS(SELECT 1 FROM public.support_tickets WHERE ticket_number = new_number) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN new_number;
END;
$$;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_ticket_number
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_ticket_number();

-- Trigger to create moderation task when ticket is created
CREATE OR REPLACE FUNCTION public.create_support_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rate_cents INTEGER;
  _username TEXT;
BEGIN
  IF NEW.status = 'open' THEN
    SELECT rate_cents INTO _rate_cents FROM public.task_rates WHERE task_type = 'support_chat' AND is_active = true;
    SELECT username INTO _username FROM public.profiles WHERE user_id = NEW.user_id;

    INSERT INTO public.moderation_tasks (task_type, target_entity_id, target_user_id, reward_cents, description, metadata)
    VALUES (
      'support_chat',
      NEW.id,
      NEW.user_id,
      COALESCE(_rate_cents, 5),
      'Demande de support #' || NEW.ticket_number || ' de ' || COALESCE(_username, 'un utilisateur'),
      jsonb_build_object('ticket_id', NEW.id, 'ticket_number', NEW.ticket_number, 'username', _username, 'subject', NEW.subject)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_support_task
AFTER INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.create_support_task();

-- Update timestamp trigger
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.album_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  album_owner_id uuid NOT NULL,
  album_ids text[] NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  duration text,
  message_id uuid,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.album_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests" ON public.album_access_requests
  FOR SELECT TO authenticated USING (requester_id = auth.uid() OR album_owner_id = auth.uid());

CREATE POLICY "Users can create requests" ON public.album_access_requests
  FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Album owners can update requests" ON public.album_access_requests
  FOR UPDATE TO authenticated USING (album_owner_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.album_access_requests;

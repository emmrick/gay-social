
-- Table for site updates/changelog entries
CREATE TABLE public.site_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'feature' CHECK (category IN ('feature', 'improvement', 'bugfix', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_updates ENABLE ROW LEVEL SECURITY;

-- Everyone can read published updates
CREATE POLICY "Anyone can read published updates"
  ON public.site_updates FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage all updates"
  ON public.site_updates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_updates;

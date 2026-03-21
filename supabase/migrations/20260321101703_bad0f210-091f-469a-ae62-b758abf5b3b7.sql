
-- Create storage bucket for ad images (public so images can be displayed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload ad images (advertisers are not authenticated)
CREATE POLICY "Anyone can upload ad images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-images');

-- Allow anyone to view ad images
CREATE POLICY "Anyone can view ad images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-images');

-- Allow anyone to update their ad images
CREATE POLICY "Anyone can update ad images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ad-images');

-- Allow anyone to delete ad images
CREATE POLICY "Anyone can delete ad images"
ON storage.objects FOR DELETE
USING (bucket_id = 'ad-images');

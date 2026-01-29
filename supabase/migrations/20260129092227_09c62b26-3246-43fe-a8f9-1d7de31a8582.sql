-- Create identity verification status enum
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Create identity verifications table
CREATE TABLE public.identity_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  selfie_url TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  status verification_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  rejection_reason TEXT,
  documents_deleted BOOLEAN NOT NULL DEFAULT false,
  admin_viewed_at TIMESTAMP WITH TIME ZONE,
  admin_screenshot_detected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification
CREATE POLICY "Users can view their own verification"
ON public.identity_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own verification
CREATE POLICY "Users can insert their own verification"
ON public.identity_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own verification (only if pending)
CREATE POLICY "Users can update their own verification"
ON public.identity_verifications
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
ON public.identity_verifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update verifications
CREATE POLICY "Admins can update verifications"
ON public.identity_verifications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_identity_verifications_user_id ON public.identity_verifications(user_id);
CREATE INDEX idx_identity_verifications_status ON public.identity_verifications(status);

-- Create trigger for updated_at
CREATE TRIGGER update_identity_verifications_updated_at
BEFORE UPDATE ON public.identity_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create private storage bucket for identity documents
INSERT INTO storage.buckets (id, name, public) VALUES ('identity-documents', 'identity-documents', false);

-- Storage policies for identity documents
CREATE POLICY "Users can upload their own identity documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'identity-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own identity documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'identity-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all identity documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'identity-documents' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete identity documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'identity-documents' 
  AND has_role(auth.uid(), 'admin')
);

-- Add is_verified column to profiles
ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;
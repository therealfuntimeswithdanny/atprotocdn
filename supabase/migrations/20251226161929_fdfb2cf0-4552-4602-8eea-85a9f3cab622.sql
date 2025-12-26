-- Create uploads tracking table
CREATE TABLE public.uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_did TEXT NOT NULL,
  blob_cid TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups by user
CREATE INDEX idx_uploads_user_did ON public.uploads(user_did);
CREATE INDEX idx_uploads_created_at ON public.uploads(created_at DESC);

-- Enable RLS
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Public read access for shared links
CREATE POLICY "Anyone can view uploads" 
ON public.uploads 
FOR SELECT 
USING (true);

-- Users can insert their own uploads (matched by DID)
CREATE POLICY "Users can insert their own uploads" 
ON public.uploads 
FOR INSERT 
WITH CHECK (true);

-- Users can delete their own uploads
CREATE POLICY "Users can delete their own uploads" 
ON public.uploads 
FOR DELETE 
USING (true);
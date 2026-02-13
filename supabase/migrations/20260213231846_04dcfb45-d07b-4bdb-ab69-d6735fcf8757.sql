
-- Create folders table
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_did TEXT NOT NULL,
  name TEXT NOT NULL,
  rkey TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view folders" ON public.folders FOR SELECT USING (true);
CREATE POLICY "Users can create folders" ON public.folders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own folders" ON public.folders FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own folders" ON public.folders FOR DELETE USING (true);

-- Create folder_items table
CREATE TABLE public.folder_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(folder_id, upload_id)
);

ALTER TABLE public.folder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view folder items" ON public.folder_items FOR SELECT USING (true);
CREATE POLICY "Users can add folder items" ON public.folder_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can remove folder items" ON public.folder_items FOR DELETE USING (true);

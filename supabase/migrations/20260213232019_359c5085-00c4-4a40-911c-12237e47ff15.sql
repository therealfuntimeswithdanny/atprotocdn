
-- Drop unused folder tables
DROP TABLE IF EXISTS public.folder_items;
DROP TABLE IF EXISTS public.folders;

-- Add record_uri column to uploads so we can reference AT URIs for stars/folders
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS record_uri TEXT;

-- Create table to store PDF asset references
CREATE TABLE public.pdf_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_type TEXT NOT NULL UNIQUE CHECK (asset_type IN ('headmaster_signature', 'school_stamp')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_assets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for PDF generation)
CREATE POLICY "PDF assets are publicly readable" 
ON public.pdf_assets 
FOR SELECT 
USING (true);

-- Only authenticated admins can insert/update/delete
CREATE POLICY "Only admins can insert PDF assets" 
ON public.pdf_assets 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Only admins can update PDF assets" 
ON public.pdf_assets 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Only admins can delete PDF assets" 
ON public.pdf_assets 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = auth.uid()
  )
);

-- Create storage bucket for PDF assets
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('pdf-assets', 'pdf-assets', true, 5242880);

-- Allow public read access to PDF assets bucket
CREATE POLICY "PDF assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pdf-assets');

-- Allow authenticated admins to upload to PDF assets bucket
CREATE POLICY "Admins can upload PDF assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'pdf-assets' 
  AND EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated admins to update PDF assets
CREATE POLICY "Admins can update PDF assets" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'pdf-assets' 
  AND EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated admins to delete PDF assets
CREATE POLICY "Admins can delete PDF assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'pdf-assets' 
  AND EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pdf_assets_updated_at
BEFORE UPDATE ON public.pdf_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
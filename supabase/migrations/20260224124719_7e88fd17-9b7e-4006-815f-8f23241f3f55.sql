-- Add image_url column to sim_card_locations for device photos
ALTER TABLE public.sim_card_locations ADD COLUMN image_url text;

-- Create storage bucket for device images
INSERT INTO storage.buckets (id, name, public) VALUES ('device-images', 'device-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for device images
CREATE POLICY "Device images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'device-images');

CREATE POLICY "Users can upload their own device images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'device-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own device images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'device-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own device images"
ON storage.objects FOR DELETE
USING (bucket_id = 'device-images' AND auth.uid()::text = (storage.foldername(name))[1]);
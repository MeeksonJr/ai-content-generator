-- RLS Policy for generated-images Storage Bucket
-- This allows authenticated users to upload images to their own folder

-- Enable RLS on the bucket (if not already enabled)
-- Note: RLS is automatically enabled when you create a bucket, but you need to add policies

-- Policy 1: Allow authenticated users to INSERT (upload) files to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generated-images'::text 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow authenticated users to SELECT (read) files from their own folder
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'generated-images'::text 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow public SELECT (read) for public bucket access
-- This is needed if the bucket is set to public
CREATE POLICY "Public can read generated images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'generated-images'::text);

-- Policy 4: Allow authenticated users to DELETE their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'generated-images'::text 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: If you want to allow users to update their files, add:
-- CREATE POLICY "Users can update their own files"
-- ON storage.objects
-- FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'generated-images'::text 
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );


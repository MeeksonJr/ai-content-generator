-- RLS Policy for avatars Storage Bucket
-- This allows authenticated users to upload avatars to their own folder

-- Policy 1: Allow authenticated users to INSERT (upload) files to their own folder
CREATE POLICY "Users can upload to their own avatar folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'::text 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow authenticated users to SELECT (read) files from their own folder
CREATE POLICY "Users can read their own avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'::text 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow public SELECT (read) for public bucket access
-- This is needed if the bucket is set to public
CREATE POLICY "Public can read avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars'::text);

-- Policy 4: Allow authenticated users to UPDATE their own files
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'::text 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'::text 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 5: Allow authenticated users to DELETE their own files
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'::text 
  AND (storage.foldername(name))[1] = auth.uid()::text
);


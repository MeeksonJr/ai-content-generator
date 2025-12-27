# Avatar Bucket Setup

## Create Avatar Bucket in Supabase

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `avatars`
4. Public: ✅ Yes (so avatars can be accessed)
5. File size limit: 5 MB (or as needed)
6. Allowed MIME types: `image/jpeg, image/png, image/gif, image/webp`

## RLS Policies for Avatars Bucket

Run this SQL in Supabase SQL Editor:

```sql
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
```

## File Path Structure

Avatars are stored as: `avatars/{userId}/{timestamp}.{ext}`

Example: `avatars/3a64aa4d-3a66-49dd-8f6b-ef80039fab0f/1735296000000.jpg`


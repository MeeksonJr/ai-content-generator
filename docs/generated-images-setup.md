# Generated Images Storage Setup

## Supabase Storage Bucket Setup

To enable image saving functionality, you need to create a storage bucket in Supabase:

### Steps:

1. **Create Storage Bucket**
   - Go to your Supabase project dashboard
   - Navigate to **Storage**
   - Click **"New bucket"**
   - Name: `generated-images`
   - Public: ✅ (checked) - This allows public access to generated images
   - Click **"Create bucket"**

2. **Set Storage Policies** (Optional but Recommended)
   - Go to Storage > Policies
   - Create policy for `generated-images` bucket:
     - Policy name: "Users can upload their own generated images"
     - Allowed operation: INSERT, SELECT
     - Policy definition:
       ```sql
       (bucket_id = 'generated-images'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
       ```
   - This ensures users can only upload to their own folder

### How It Works

1. When a user generates an image, it's returned as a base64 data URL
2. When the user clicks "Save", the image is:
   - Converted from base64 to a Blob
   - Uploaded to Supabase Storage in the `generated-images` bucket
   - Stored in a user-specific folder: `generated-images/{userId}/{timestamp}-{random}.png`
   - The public URL is retrieved and saved to the `content` table's `image_url` column
3. The image can then be displayed in saved content using the stored URL

### File Structure

```
generated-images/
  ├── {user-id-1}/
  │   ├── 1234567890-abc123.png
  │   └── 1234567891-def456.png
  ├── {user-id-2}/
  │   └── 1234567892-ghi789.png
  └── ...
```

### Notes

- Images are stored as PNG format
- Each image gets a unique filename with timestamp and random string
- The bucket should be public to allow direct image access
- Images are organized by user ID for easier management


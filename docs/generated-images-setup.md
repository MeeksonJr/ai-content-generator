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

2. **Set Storage Policies (REQUIRED)**
   - Go to Storage > Policies in Supabase dashboard
   - OR run the SQL script in `docs/generated-images-rls-policy.sql` in the SQL Editor
   - The policies allow:
     - Authenticated users to upload files to their own folder
     - Authenticated users to read their own files
     - Public read access (since bucket is public)
     - Authenticated users to delete their own files
   - **Important**: Without these policies, you'll get "new row violates row-level security policy" errors

### How It Works

1. When a user generates an image, it's returned as a base64 data URL
2. When the user clicks "Save", the image is:
   - Converted from base64 to a Blob
   - Uploaded to Supabase Storage in the `generated-images` bucket
   - Stored in a user-specific folder: `{userId}/{timestamp}-{random}.png` (path within bucket)
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


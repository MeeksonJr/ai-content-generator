# User Profile Management Setup Guide

## Database Migration

Before using the profile management features, you need to run the database migration to add the new columns to the `user_profiles` table.

### Steps:

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run the Migration Script**
   - Copy the contents of `docs/user-profiles-migration.sql`
   - Paste into SQL Editor
   - Click "Run" to execute

3. **Verify Migration**
   - Check that the `user_profiles` table now has these columns:
     - `bio` (TEXT)
     - `avatar_url` (TEXT)
     - `twitter_url` (TEXT)
     - `linkedin_url` (TEXT)
     - `github_url` (TEXT)
     - `website_url` (TEXT)
     - `location` (TEXT)
     - `display_name` (TEXT)

## Supabase Storage Setup

For avatar uploads to work, you need to create a storage bucket:

1. **Create Storage Bucket**
   - Go to Storage in Supabase dashboard
   - Click "New bucket"
   - Name: `avatars`
   - Public: ✅ (checked)
   - Click "Create bucket"

2. **Set Storage Policies** (if needed)
   - Go to Storage > Policies
   - Create policy for `avatars` bucket:
     - Policy name: "Users can upload their own avatars"
     - Allowed operation: INSERT, UPDATE, DELETE
     - Policy definition:
       ```sql
       (bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
       ```

## Features Implemented

✅ **Profile Picture Upload**
- Upload images (JPG, PNG, GIF)
- Max size: 5MB
- Stored in Supabase Storage
- Automatic URL generation
- Remove avatar functionality

✅ **Bio/Description**
- Text area with 500 character limit
- Character counter
- Rich text support (future enhancement)

✅ **Social Links**
- Twitter URL
- LinkedIn URL
- GitHub URL
- Website URL
- URL validation

✅ **Additional Fields**
- Display name (overrides auth name)
- Location
- Company (from user_metadata)

## API Endpoints

### GET `/api/profile`
Fetch current user's profile

**Response:**
```json
{
  "profile": {
    "id": "uuid",
    "display_name": "string",
    "bio": "string",
    "avatar_url": "string",
    "location": "string",
    "twitter_url": "string",
    "linkedin_url": "string",
    "github_url": "string",
    "website_url": "string",
    "is_admin": false,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### PATCH `/api/profile`
Update user profile

**Request Body:**
```json
{
  "display_name": "string",
  "bio": "string",
  "location": "string",
  "twitter_url": "string",
  "linkedin_url": "string",
  "github_url": "string",
  "website_url": "string",
  "avatar_url": "string"
}
```

### POST `/api/profile/upload-avatar`
Upload profile picture

**Request:**
- FormData with `file` field
- Content-Type: multipart/form-data

**Response:**
```json
{
  "avatar_url": "https://..."
}
```

## Usage

1. Navigate to Settings > Profile tab
2. Upload a profile picture (optional)
3. Fill in your bio, location, and social links
4. Click "Save Changes"

The profile data is stored in the `user_profiles` table and synced with Supabase auth `user_metadata` for backward compatibility.


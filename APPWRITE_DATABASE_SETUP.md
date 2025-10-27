# Appwrite Database Setup Instructions

## Quick Setup Checklist

Follow these steps in the Appwrite Console to complete the migration:

### 1️⃣ Create `profiles_config` Collection

**Path:** Appwrite Console → Databases → lemongrab_db → Create Collection

1. Click **"Create Collection"**
2. **Collection ID:** `profiles_config`
3. **Collection Name:** Profiles Configuration

#### Add Attributes:

| # | Attribute Key | Type | Size | Required | Array | Default |
|---|--------------|------|------|----------|-------|---------|
| 1 | `user_id` | String | 255 | ✅ Yes | ❌ No | - |
| 2 | `name` | String | 255 | ✅ Yes | ❌ No | - |
| 3 | `endpoint` | String | 500 | ✅ Yes | ❌ No | - |
| 4 | `api_key` | String | 500 | ✅ Yes | ❌ No | - |
| 5 | `deployment` | String | 255 | ✅ Yes | ❌ No | - |
| 6 | `sora_version` | String | 50 | ✅ Yes | ❌ No | `sora-1` |
| 7 | `is_active` | Boolean | - | ❌ No | ❌ No | `false` |

#### Set Permissions:

**CRITICAL:** You must configure document-level security to ensure users can only access their own profiles.

Go to **Settings** → **Permissions** for the `profiles_config` collection:

1. **Remove** any default "Any" or "Guests" permissions
2. Click **"Add Role"**
3. Select **"Users"** 
4. Check: ✅ Create, ✅ Read, ✅ Update, ✅ Delete
5. Under **"Document Security"**, ensure the collection is set to **"Document Level"** (not Collection Level)
6. Save

This ensures users can only CRUD their own documents (filtered by `user_id`).

#### Create Indexes (Optional but Recommended):
- **Index 1:** `idx_user_id` on `user_id` (Ascending)
- **Index 2:** `idx_user_active` on `user_id, is_active` (Ascending)

---

### 2️⃣ Create `video_metadata` Collection

**Path:** Appwrite Console → Databases → lemongrab_db → Create Collection

1. Click **"Create Collection"**
2. **Collection ID:** `video_metadata`
3. **Collection Name:** Video Metadata

#### Add Attributes:

| # | Attribute Key | Type | Size | Required | Array | Default |
|---|--------------|------|------|----------|-------|---------|
| 1 | `user_id` | String | 255 | ✅ Yes | ❌ No | - |
| 2 | `appwrite_file_id` | String | 255 | ✅ Yes | ❌ No | - |
| 3 | `url` | String | 1000 | ✅ Yes | ❌ No | - |
| 4 | `prompt` | String | 2000 | ✅ Yes | ❌ No | - |
| 5 | `height` | String | 50 | ✅ Yes | ❌ No | - |
| 6 | `width` | String | 50 | ✅ Yes | ❌ No | - |
| 7 | `duration` | String | 50 | ✅ Yes | ❌ No | - |
| 8 | `sora_version` | String | 50 | ❌ No | ❌ No | `sora-1` |
| 9 | `azure_video_id` | String | 255 | ❌ No | ❌ No | `null` |

#### Set Permissions:

**CRITICAL:** You must configure document-level security to ensure users can only access their own video metadata.

Go to **Settings** → **Permissions** for the `video_metadata` collection:

1. **Remove** any default "Any" or "Guests" permissions
2. Click **"Add Role"**
3. Select **"Users"**
4. Check: ✅ Create, ✅ Read, ✅ Update, ✅ Delete
5. Under **"Document Security"**, ensure the collection is set to **"Document Level"** (not Collection Level)
6. Save

This ensures users can only CRUD their own video metadata (filtered by `user_id`).

#### Create Indexes (Optional but Recommended):
- **Index 1:** `idx_user_videos` on `user_id` (Ascending)
- **Index 2:** `idx_created_at` on `$createdAt` (Descending)

---

## 3️⃣ Update Database Constants

Update `src/lib/appwrite.ts` to include the new collection IDs:

```typescript
export const DATABASE_ID = 'lemongrab_db';
export const SETTINGS_COLLECTION_ID = 'settings';
export const GENERATIONS_COLLECTION_ID = 'video_generations';
export const PROFILES_COLLECTION_ID = 'profiles_config'; // ✨ Add this
export const VIDEO_METADATA_COLLECTION_ID = 'video_metadata'; // ✨ Add this
```

---

## 4️⃣ Test the Setup

### Test Profiles:
1. Navigate to `/settings`
2. Click **"Create New"** profile
3. Fill in:
   - Name: `Test Profile`
   - Endpoint: `https://your-endpoint.openai.azure.com`
   - API Key: `your-api-key`
   - Deployment: `sora-model`
   - Sora Version: `sora-1`
4. Click **"Save Profile"**
5. Verify it appears in the profiles list
6. Open **Incognito browser**
7. Login with same account
8. Navigate to `/settings`
9. ✅ **Profile should appear!** (Previously it wouldn't due to localStorage)

### Test Videos:
1. Navigate to `/dashboard`
2. Generate a test video
3. Wait for completion
4. Verify video appears in "Your Videos" section
5. Navigate to `/gallery`
6. ✅ **Video should appear!**
7. Open **Incognito browser**
8. Login with same account
9. Navigate to `/gallery`
10. ✅ **All your videos should appear!** (Previously would be empty)

---

## 5️⃣ Migration from localStorage

### Automatic Migration via Appwrite Function

I've created an Appwrite Function to automatically migrate localStorage data to the database.

#### Setup Steps:

1. **The function code is ready** in `appwrite/functions/migrate-localstorage/`
2. **Set up the function in Appwrite Console:**
   - Go to Appwrite Console → Functions
   - Wait for your GitHub CI/CD to automatically deploy the `migrate-localstorage` function
   - OR manually create it:
     - **Name:** `migrate-localstorage`
     - **Runtime:** Node.js 18+
     - **Entry Point:** `index.js`
     - **Execute Access:** Users (authenticated)

3. **The migration UI is already integrated** in the Dashboard - users will see a banner if they have localStorage data

#### How It Works:

1. User logs in and visits Dashboard
2. If localStorage data is detected, a **Migration Banner** appears
3. User clicks **"Migrate to Cloud"**
4. Function receives localStorage data and creates Appwrite Database records
5. localStorage is cleared after successful migration
6. Page reloads to show migrated data

#### What Gets Migrated:

- **Profiles:** Azure API configurations (endpoint, API key, deployment, Sora version)
- **Video Metadata:** Generated video records (prompts, dimensions, URLs)

#### Security:

- Function requires JWT authentication
- All migrated data is associated with the requesting user's ID
- Duplicate detection prevents data conflicts

---

## 📊 Collection Summary

| Collection | Purpose | Key Attributes | User-Specific |
|-----------|---------|----------------|---------------|
| `profiles_config` | Store Azure API profiles | endpoint, api_key, deployment | ✅ Yes |
| `video_metadata` | Store video generation metadata | prompt, dimensions, sora_version | ✅ Yes |
| `video_generations` | Cost tracking (existing) | cost, duration, resolution | ✅ Yes |

---

## 🔐 Security Notes

- **API Keys:** Stored in `profiles_config.api_key` are **user-specific** and protected by RLS
- **Video URLs:** Stored in `video_metadata.url` point to Appwrite Storage with proper auth
- **User Isolation:** All collections enforce `user_id` checks via Row-Level Security policies

---

## ❓ Troubleshooting

### Issue: "Profile not found" error
**Solution:** Verify `profiles_config` collection exists with correct permissions

### Issue: Videos not appearing in Gallery
**Solution:** 
1. Check `video_metadata` collection exists
2. Verify Storage bucket permissions are correct
3. Check browser console for CORS errors

### Issue: Can't create profile
**Solution:** 
1. Verify you're logged in (check auth token)
2. Check `user_id` attribute exists in `profiles_config`
3. Verify Create permission is enabled for Users role

---

## 📞 Need Help?

If you encounter any issues during setup, let me know which step failed and I'll help debug!

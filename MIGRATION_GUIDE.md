# Migration Guide: localStorage to Appwrite Database

## Overview

This migration removes all localStorage dependencies and moves data to Appwrite Cloud database for proper multi-device sync and data persistence.

## Changes Made

### 1. Profiles Storage (CRITICAL)
**Before:** Profiles stored in `localStorage` under `lemongrab_profiles` key  
**After:** Stored in Appwrite database collection `profiles_config`

### 2. Video Metadata Storage
**Before:** Video metadata stored in `localStorage` under `lemongrab_video_metadata` key  
**After:** Stored in Appwrite database collection `video_metadata`

### 3. Gallery Limit
**Before:** Gallery showed only 6 videos (hardcoded)  
**After:** Gallery shows up to 100 videos from Appwrite Storage

---

## Required Appwrite Database Setup

### Step 1: Create Collections

#### Collection 1: `profiles_config`
Navigate to: **Appwrite Console → Databases → lemongrab_db → Create Collection**

**Collection ID:** `profiles_config`

**Attributes:**
| Attribute Name | Type | Required | Default | Notes |
|---------------|------|----------|---------|-------|
| `user_id` | String | ✅ Yes | - | Reference to auth user |
| `name` | String | ✅ Yes | - | Profile name |
| `endpoint` | String | ✅ Yes | - | Azure OpenAI endpoint |
| `api_key` | String | ✅ Yes | - | Azure API key |
| `deployment` | String | ✅ Yes | - | Deployment name |
| `sora_version` | String (enum) | ✅ Yes | sora-1 | Options: `sora-1`, `sora-2` |
| `is_active` | Boolean | ❌ No | false | Only one active per user |

**Indexes:**
```
- idx_user_id: user_id (asc)
- idx_active: user_id, is_active (where is_active = true)
```

**Permissions:**
- Role: Users - Read, Create, Update, Delete (for `user_id = $userId`)

---

#### Collection 2: `video_metadata`
Navigate to: **Appwrite Console → Databases → lemongrab_db → Create Collection**

**Collection ID:** `video_metadata`

**Attributes:**
| Attribute Name | Type | Required | Default | Notes |
|---------------|------|----------|---------|-------|
| `user_id` | String | ✅ Yes | - | Reference to auth user |
| `appwrite_file_id` | String | ✅ Yes | - | Unique file ID from Storage |
| `url` | String | ✅ Yes | - | Full video URL |
| `prompt` | String | ✅ Yes | - | Generation prompt |
| `height` | String | ✅ Yes | - | Video height (e.g., "720") |
| `width` | String | ✅ Yes | - | Video width (e.g., "1280") |
| `duration` | String | ✅ Yes | - | Duration in seconds |
| `sora_version` | String | ❌ No | sora-1 | Sora version used |
| `azure_video_id` | String | ❌ No | null | Azure video ID |

**Indexes:**
```
- idx_user_videos: user_id (asc)
- idx_created_at: $createdAt (desc)
```

**Permissions:**
- Role: Users - Read, Create, Update, Delete (for `user_id = $userId`)

---

### Step 2: Manual Data Migration

Since this app uses **Appwrite (not Lovable Cloud/Supabase)**, you need to manually migrate existing localStorage data:

#### Option A: Export from Browser Console (Manual)
1. Open your app in the browser
2. Open DevTools Console (F12)
3. Run this script:

```javascript
// Export profiles
const profiles = localStorage.getItem('lemongrab_profiles');
console.log('Profiles:', profiles);

// Export active profile ID
const activeId = localStorage.getItem('lemongrab_active_profile');
console.log('Active Profile ID:', activeId);

// Export legacy settings (if exists)
const legacy = localStorage.getItem('lemongrab_settings');
console.log('Legacy Settings:', legacy);
```

4. Copy the output and manually create documents in Appwrite Console for each profile

#### Option B: Use Appwrite API (Automated)
Create a one-time migration script:

```javascript
import { Client, Databases, ID } from 'appwrite';

const client = new Client()
  .setEndpoint('https://syd.cloud.appwrite.io/v1')
  .setProject('lemongrab');

const databases = new Databases(client);

// Get localStorage data
const profilesData = JSON.parse(localStorage.getItem('lemongrab_profiles') || '[]');

// Migrate each profile
for (const profile of profilesData) {
  await databases.createDocument(
    'lemongrab_db',
    'profiles_config',
    ID.unique(),
    {
      user_id: 'YOUR_USER_ID', // Get from account.get()
      name: profile.name,
      endpoint: profile.endpoint,
      api_key: profile.apiKey,
      deployment: profile.deployment,
      sora_version: profile.soraVersion,
      is_active: profile.id === activeProfileId
    }
  );
}
```

---

### Step 3: Appwrite Function (Optional - For Auto-Migration)

If you want to create an Appwrite Function to help with migration, create:

**Function:** `migrate-localstorage-to-db`

```javascript
// appwrite/functions/migrate-localstorage-to-db/index.js
import { Client, Databases, ID } from 'node-appwrite';

export default async ({ req, res }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  
  try {
    const { profiles, userId } = JSON.parse(req.body);
    
    const results = [];
    for (const profile of profiles) {
      const doc = await databases.createDocument(
        'lemongrab_db',
        'profiles_config',
        ID.unique(),
        {
          user_id: userId,
          name: profile.name,
          endpoint: profile.endpoint,
          api_key: profile.apiKey,
          deployment: profile.deployment,
          sora_version: profile.soraVersion,
          is_active: profile.is_active || false
        }
      );
      results.push(doc.$id);
    }
    
    return res.json({ success: true, migrated: results.length });
  } catch (error) {
    return res.json({ success: false, error: error.message }, 500);
  }
};
```

**Setup Instructions:**
1. Create function in Appwrite Console
2. Deploy code from `appwrite/functions/migrate-localstorage-to-db/`
3. Call from frontend with existing localStorage data
4. Once migrated, clear localStorage

---

## Testing Checklist

After migration, test these scenarios:

- [ ] **Profiles:**
  - [ ] Create new profile
  - [ ] Edit existing profile
  - [ ] Delete profile
  - [ ] Set active profile
  - [ ] Switch between profiles
  - [ ] Profiles persist across browser sessions
  - [ ] Profiles sync in incognito/different browsers with same login

- [ ] **Videos:**
  - [ ] Generate new video
  - [ ] Video appears in Dashboard "Your Videos"
  - [ ] Video appears in /gallery
  - [ ] Gallery shows ALL videos (not just 6)
  - [ ] Delete video removes from both storage and database
  - [ ] Videos persist across browser sessions
  - [ ] Videos accessible in incognito with same login

- [ ] **Authentication:**
  - [ ] Login in normal browser
  - [ ] Open incognito, login with same account
  - [ ] Verify profiles appear in /settings
  - [ ] Verify videos appear in /gallery
  - [ ] Logout and re-login preserves data

---

## Files Modified

### Core Library Files
- ✅ `src/lib/profiles.ts` - Now uses Appwrite Databases API
- ✅ `src/lib/appwriteStorage.ts` - Removed localStorage, saves metadata to DB, increased gallery limit to 100

### Component Files
- ✅ `src/components/VideoGenerationForm.tsx` - Async profile loading
- ✅ `src/components/VideoGallery.tsx` - Removed localStorage for API key
- ✅ `src/pages/Dashboard.tsx` - Async profile loading
- ✅ `src/pages/Gallery.tsx` - Removed localStorage for API key
- ✅ `src/pages/Settings.tsx` - Async profile loading

### New Files
- ✅ `profiles_export.csv` - Template for manual CSV import
- ✅ `MIGRATION_GUIDE.md` - This file

---

## Rollback Plan

If issues occur, you can temporarily revert by:

1. Checkout previous commit: `git checkout <previous-commit-hash>`
2. Redeploy to restore localStorage functionality
3. Address migration issues
4. Re-attempt migration when ready

---

## Support & Next Steps

**If you need the Appwrite Function for migration:**
Let me know and I'll create the full function implementation with deployment instructions.

**Once migration is complete:**
1. Clear all localStorage keys in browser console:
```javascript
localStorage.removeItem('lemongrab_profiles');
localStorage.removeItem('lemongrab_active_profile');
localStorage.removeItem('lemongrab_settings');
localStorage.removeItem('lemongrab_video_metadata');
```

2. Test thoroughly in both normal and incognito browsers
3. Deploy to production

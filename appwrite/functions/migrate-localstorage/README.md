# localStorage Migration Function

## Purpose
Migrates existing localStorage data (profiles and video metadata) to Appwrite Database collections for authenticated users.

## Setup Instructions

### 1. Configure Function in Appwrite Console

**Path:** Appwrite Console → Functions → Create Function

- **Name:** `migrate-localstorage`
- **Runtime:** Node.js 18+
- **Entry Point:** `index.js`
- **Execute Access:** Users (authenticated only)

### 2. Deploy Function

Once you push this code to GitHub, your CI/CD pipeline will automatically deploy it to Appwrite.

### 3. Test the Function

You can test the function using the frontend migration UI or manually via curl:

```bash
curl -X POST \
  https://syd.cloud.appwrite.io/v1/functions/[FUNCTION_ID]/executions \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Project: lemongrab" \
  -H "X-Appwrite-JWT: [YOUR_JWT_TOKEN]" \
  -d '{
    "profiles": [
      {
        "name": "Production Profile",
        "endpoint": "https://your-endpoint.openai.azure.com",
        "apiKey": "your-api-key",
        "deployment": "sora-model",
        "soraVersion": "sora-1",
        "isActive": true
      }
    ],
    "videos": [
      {
        "appwriteFileId": "file123",
        "url": "https://storage.url/video.mp4",
        "prompt": "A cat playing piano",
        "height": 1080,
        "width": 1920,
        "duration": 5,
        "soraVersion": "sora-1"
      }
    ]
  }'
```

## Request Format

### Input
```json
{
  "profiles": [
    {
      "name": "string",
      "endpoint": "string",
      "apiKey": "string",
      "deployment": "string",
      "soraVersion": "sora-1" | "sora-2",
      "isActive": boolean
    }
  ],
  "videos": [
    {
      "appwriteFileId": "string",
      "url": "string",
      "prompt": "string",
      "height": number,
      "width": number,
      "duration": number,
      "soraVersion": "sora-1" | "sora-2",
      "azureVideoId": "string" (optional)
    }
  ]
}
```

### Success Response
```json
{
  "success": true,
  "results": {
    "profilesMigrated": 2,
    "profilesSkipped": 0,
    "videosMigrated": 5,
    "videosSkipped": 0,
    "errors": []
  },
  "message": "Migrated 2 profiles and 5 videos"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Features

- ✅ **User-specific migration** - Only migrates data for the authenticated user
- ✅ **Duplicate detection** - Skips profiles/videos that already exist
- ✅ **Batch processing** - Handles multiple profiles and videos in one request
- ✅ **Error reporting** - Returns detailed errors for failed migrations
- ✅ **CORS enabled** - Can be called from web frontend

## Security

- Requires valid JWT authentication
- All migrated data is associated with the requesting user's ID
- API keys stored in profiles are user-specific and protected by RLS

## Frontend Integration

Call this function from your frontend after detecting localStorage data:

```typescript
import { functions } from '@/lib/appwrite';

async function migrateLocalStorage() {
  // Extract localStorage data
  const oldSettings = JSON.parse(localStorage.getItem('lemongrab_settings') || '{}');
  const oldVideos = JSON.parse(localStorage.getItem('lemongrab_videos') || '[]');
  
  // Transform to migration format
  const migrationData = {
    profiles: oldSettings.profiles?.map(p => ({
      name: p.name,
      endpoint: p.endpoint,
      apiKey: p.apiKey,
      deployment: p.deployment,
      soraVersion: p.soraVersion,
      isActive: p.isActive
    })) || [],
    videos: oldVideos.map(v => ({
      appwriteFileId: v.id,
      url: v.url,
      prompt: v.prompt,
      height: v.height,
      width: v.width,
      duration: v.duration,
      soraVersion: v.soraVersion
    }))
  };
  
  // Call migration function
  const result = await functions.createExecution(
    'migrate-localstorage',
    JSON.stringify(migrationData),
    false
  );
  
  const response = JSON.parse(result.responseBody);
  
  if (response.success) {
    console.log('Migration successful:', response.results);
    // Clear localStorage after successful migration
    localStorage.removeItem('lemongrab_settings');
    localStorage.removeItem('lemongrab_videos');
  } else {
    console.error('Migration failed:', response.error);
  }
}
```

## Troubleshooting

### Issue: "Authentication required" error
**Solution:** Ensure the user is logged in and the JWT token is valid

### Issue: Migration completes but data not visible
**Solution:** 
1. Check that the collections exist in Appwrite
2. Verify RLS permissions are set correctly
3. Ensure `user_id` attribute exists in both collections

### Issue: "Duplicate" profiles appearing
**Solution:** The function checks for exact matches (name + endpoint). If profiles differ slightly, they'll be treated as unique.
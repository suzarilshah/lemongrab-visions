import { Client, Databases, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID);

  // Set the API key for server-side operations
  if (process.env.APPWRITE_API_KEY) {
    client.setKey(process.env.APPWRITE_API_KEY);
  }

  const databases = new Databases(client);
  
  const DATABASE_ID = 'lemongrab_db';
  const PROFILES_COLLECTION_ID = 'profiles_config';
  const VIDEO_METADATA_COLLECTION_ID = 'video_metadata';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.json({ ok: true }, 200, corsHeaders);
  }

  try {
    // Extract user ID from JWT
    const userId = req.headers['x-appwrite-user-id'];
    if (!userId) {
      error('[Migration] No user ID in request headers');
      return res.json(
        { success: false, error: 'Authentication required' },
        401,
        corsHeaders
      );
    }

    log(`[Migration] Starting migration for user: ${userId}`);

    // Parse request body
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      error('[Migration] Failed to parse request body:', e);
      return res.json(
        { success: false, error: 'Invalid JSON in request body' },
        400,
        corsHeaders
      );
    }

    const { profiles = [], videos = [] } = body;
    
    log(`[Migration] Received ${profiles.length} profiles and ${videos.length} videos`);

    const results = {
      profilesMigrated: 0,
      profilesSkipped: 0,
      videosMigrated: 0,
      videosSkipped: 0,
      errors: [],
    };

    // Migrate profiles
    for (const profile of profiles) {
      try {
        // Check if profile already exists (by name and endpoint)
        const existing = await databases.listDocuments(
          DATABASE_ID,
          PROFILES_COLLECTION_ID,
          [
            `user_id="${userId}"`,
            `name="${profile.name}"`,
            `endpoint="${profile.endpoint}"`,
          ]
        );

        if (existing.documents.length > 0) {
          log(`[Migration] Profile "${profile.name}" already exists, skipping`);
          results.profilesSkipped++;
          continue;
        }

        // Create new profile
        await databases.createDocument(
          DATABASE_ID,
          PROFILES_COLLECTION_ID,
          ID.unique(),
          {
            user_id: userId,
            name: profile.name || 'Imported Profile',
            endpoint: profile.endpoint || '',
            api_key: profile.apiKey || '',
            deployment: profile.deployment || '',
            sora_version: profile.soraVersion || 'sora-1',
            is_active: profile.isActive || false,
          }
        );

        log(`[Migration] Successfully migrated profile: ${profile.name}`);
        results.profilesMigrated++;
      } catch (err) {
        error(`[Migration] Failed to migrate profile "${profile.name}":`, err);
        results.errors.push({
          type: 'profile',
          name: profile.name,
          error: err.message,
        });
      }
    }

    // Migrate video metadata
    for (const video of videos) {
      try {
        // Check if video metadata already exists
        const existing = await databases.listDocuments(
          DATABASE_ID,
          VIDEO_METADATA_COLLECTION_ID,
          [
            `user_id="${userId}"`,
            `appwrite_file_id="${video.appwriteFileId}"`,
          ]
        );

        if (existing.documents.length > 0) {
          log(`[Migration] Video "${video.appwriteFileId}" already exists, skipping`);
          results.videosSkipped++;
          continue;
        }

        // Create new video metadata
        await databases.createDocument(
          DATABASE_ID,
          VIDEO_METADATA_COLLECTION_ID,
          ID.unique(),
          {
            user_id: userId,
            appwrite_file_id: video.appwriteFileId || '',
            url: video.url || '',
            prompt: video.prompt || '',
            height: video.height?.toString() || '1080',
            width: video.width?.toString() || '1920',
            duration: video.duration?.toString() || '5',
            sora_version: video.soraVersion || 'sora-1',
            azure_video_id: video.azureVideoId || null,
          }
        );

        log(`[Migration] Successfully migrated video: ${video.appwriteFileId}`);
        results.videosMigrated++;
      } catch (err) {
        error(`[Migration] Failed to migrate video "${video.appwriteFileId}":`, err);
        results.errors.push({
          type: 'video',
          id: video.appwriteFileId,
          error: err.message,
        });
      }
    }

    log('[Migration] Migration completed:', results);

    return res.json(
      {
        success: true,
        results,
        message: `Migrated ${results.profilesMigrated} profiles and ${results.videosMigrated} videos`,
      },
      200,
      corsHeaders
    );
  } catch (err) {
    error('[Migration] Fatal error:', err);
    return res.json(
      {
        success: false,
        error: err.message || 'Unknown error occurred',
      },
      500,
      corsHeaders
    );
  }
};

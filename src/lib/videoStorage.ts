/**
 * Video Storage/Metadata Module
 * Migrated from Appwrite to Neon PostgreSQL
 * 
 * Note: Video files are stored externally (Azure). This module manages metadata only.
 */
import { sql } from './db';
import { requireUserId, getCurrentUser } from './auth';

export interface VideoMetadata {
  id: string;
  url: string;
  prompt: string;
  timestamp: string;
  height: string;
  width: string;
  duration: string;
  soraVersion?: string;
  azureVideoId?: string;
  appwriteFileId?: string;
}

// Database row type
interface DbVideoMetadata {
  id: string;
  user_id: string;
  appwrite_file_id: string | null;
  url: string;
  prompt: string;
  height: string;
  width: string;
  duration: string;
  sora_version: string | null;
  azure_video_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to VideoMetadata
 */
function dbRowToMetadata(row: DbVideoMetadata): VideoMetadata {
  return {
    id: row.id,
    url: row.url,
    prompt: row.prompt,
    timestamp: row.created_at,
    height: row.height,
    width: row.width,
    duration: row.duration,
    soraVersion: row.sora_version || 'sora-1',
    azureVideoId: row.azure_video_id || undefined,
    appwriteFileId: row.appwrite_file_id || undefined,
  };
}

/**
 * Save video metadata to database
 */
export async function saveVideoMetadata(metadata: Omit<VideoMetadata, 'id' | 'timestamp'>): Promise<VideoMetadata> {
  try {
    const userId = await requireUserId();

    // Generate a unique ID for new records
    const id = crypto.randomUUID();

    const rows = await sql`
      INSERT INTO video_metadata (id, user_id, appwrite_file_id, url, prompt, height, width, duration, sora_version, azure_video_id)
      VALUES (
        ${id},
        ${userId},
        ${metadata.appwriteFileId || null},
        ${metadata.url},
        ${metadata.prompt},
        ${metadata.height},
        ${metadata.width},
        ${metadata.duration},
        ${metadata.soraVersion || 'sora-1'},
        ${metadata.azureVideoId || null}
      )
      RETURNING *
    `;

    if (rows.length === 0) {
      throw new Error('Failed to save video metadata');
    }

    console.log("[VideoStorage] Video metadata saved to database", { appwriteFileId: metadata.appwriteFileId });
    return dbRowToMetadata(rows[0] as DbVideoMetadata);
  } catch (error: unknown) {
    console.error("[VideoStorage] Error saving video metadata:", error);
    throw error;
  }
}

/**
 * List videos from database
 */
export async function listVideosFromStorage(limit: number = 100): Promise<VideoMetadata[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log("[VideoStorage] No user logged in");
      return [];
    }

    console.log(`[VideoStorage] Fetching latest ${limit} videos for user ${user.id}`);
    
    const rows = await sql`
      SELECT * FROM video_metadata
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    console.log("[VideoStorage] Retrieved", rows.length, "videos");
    return (rows as DbVideoMetadata[]).map(dbRowToMetadata);
  } catch (error: unknown) {
    console.error("[VideoStorage] List error:", error);
    return [];
  }
}

/**
 * Delete video metadata from database
 */
export async function deleteVideoMetadata(id: string): Promise<void> {
  try {
    const userId = await requireUserId();
    
    console.log("[VideoStorage] Deleting video:", id);
    await sql`DELETE FROM video_metadata WHERE id = ${id} AND user_id = ${userId}`;
    console.log("[VideoStorage] Video metadata deleted successfully");
  } catch (error: unknown) {
    console.error("[VideoStorage] Delete error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to delete video: ${message}`);
  }
}

/**
 * Get a single video by ID
 */
export async function getVideoById(id: string): Promise<VideoMetadata | null> {
  try {
    const userId = await requireUserId();
    
    const rows = await sql`
      SELECT * FROM video_metadata WHERE id = ${id} AND user_id = ${userId}
    `;

    return rows.length > 0 ? dbRowToMetadata(rows[0] as DbVideoMetadata) : null;
  } catch (error: unknown) {
    console.error("[VideoStorage] Get video error:", error);
    return null;
  }
}

// Export aliases for backward compatibility
export const listVideosFromAppwrite = listVideosFromStorage;
export const deleteVideoFromAppwrite = deleteVideoMetadata;
export const uploadVideoToAppwrite = async (
  _videoBlob: Blob,
  prompt: string,
  height: string,
  width: string,
  duration: string,
  soraVersion?: string,
  azureVideoId?: string,
  videoUrl?: string
): Promise<VideoMetadata> => {
  // Note: Actual video storage is handled externally (Azure/ingest function)
  // This function now only saves metadata
  return saveVideoMetadata({
    url: videoUrl || '',
    prompt,
    height,
    width,
    duration,
    soraVersion,
    azureVideoId,
  });
};

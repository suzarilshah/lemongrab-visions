/**
 * Cost Tracking Module
 * Migrated from Appwrite to Neon PostgreSQL
 */
import { sql } from './db';
import { requireUserId, getCurrentUser } from './auth';

export interface GenerationData {
  prompt: string;
  soraModel: string;
  duration: number;
  resolution: string;
  variants: number;
  generationMode: string;
  estimatedCost: number;
  videoId?: string | null;
  profileName?: string | null;
  status?: string; // queued | running | completed | failed | canceled
  jobId?: string | null;
}

export interface GenerationRecord extends GenerationData {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Database row type
interface DbGenerationRow {
  id: string;
  user_id: string;
  prompt: string;
  sora_model: string;
  duration: number;
  resolution: string;
  variants: number;
  generation_mode: string;
  estimated_cost: string; // Decimal comes as string from DB
  video_id: string | null;
  profile_name: string | null;
  status: string | null;
  job_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to GenerationRecord
 */
function dbRowToRecord(row: DbGenerationRow): GenerationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    prompt: row.prompt,
    soraModel: row.sora_model,
    duration: row.duration,
    resolution: row.resolution,
    variants: row.variants,
    generationMode: row.generation_mode,
    estimatedCost: parseFloat(row.estimated_cost),
    videoId: row.video_id,
    profileName: row.profile_name,
    status: row.status || 'completed',
    jobId: row.job_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Calculate estimated cost for a video generation
 */
export function calculateCost(
  width: string,
  height: string,
  duration: string,
  variants: string,
  soraVersion: string
): number {
  const w = parseInt(width) || 1280;
  const h = parseInt(height) || 720;
  const d = parseInt(duration) || 12;
  const v = parseInt(variants) || 1;

  if (soraVersion === "sora-2") {
    // Sora 2 pricing: $0.10 per second
    return 0.10 * d * v;
  } else {
    // Sora 1 pricing: ~$0.05 per second per variant at 720p, scales with resolution
    const basePrice = 0.05;
    const basePixels = 1280 * 720;
    const currentPixels = w * h;
    const resolutionMultiplier = currentPixels / basePixels;
    return basePrice * d * v * resolutionMultiplier;
  }
}

/**
 * Save a new generation record
 */
export async function saveGenerationRecord(data: GenerationData): Promise<void> {
  try {
    const userId = await requireUserId();
    const id = crypto.randomUUID();
    
    await sql`
      INSERT INTO video_generations 
      (id, user_id, prompt, sora_model, duration, resolution, variants, generation_mode, estimated_cost, video_id, profile_name, status, job_id)
      VALUES (
        ${id},
        ${userId}, 
        ${data.prompt}, 
        ${data.soraModel}, 
        ${data.duration}, 
        ${data.resolution}, 
        ${data.variants}, 
        ${data.generationMode}, 
        ${data.estimatedCost}, 
        ${data.videoId || null}, 
        ${data.profileName || null}, 
        ${data.status || 'completed'}, 
        ${data.jobId || null}
      )
    `;
    console.log("[CostTracking] Generation record saved successfully");
  } catch (error: unknown) {
    console.error("[CostTracking] Failed to save generation record:", error);
    // Don't throw error to avoid blocking the main flow
  }
}

/**
 * Upsert a generation record (create or update based on jobId)
 */
export async function upsertGenerationRecord(
  data: Required<Pick<GenerationData, 'jobId'>> & GenerationData
): Promise<void> {
  try {
    if (!data.jobId) return;
    
    const userId = await requireUserId();
    
    // Check if record exists
    const existing = await sql`
      SELECT id FROM video_generations WHERE job_id = ${data.jobId} AND user_id = ${userId}
    `;

    if (existing.length === 0) {
      await saveGenerationRecord(data);
      return;
    }

    const existingId = (existing[0] as { id: string }).id;

    // Update existing record
    await sql`
      UPDATE video_generations
      SET prompt = ${data.prompt},
          sora_model = ${data.soraModel},
          duration = ${data.duration},
          resolution = ${data.resolution},
          variants = ${data.variants},
          generation_mode = ${data.generationMode},
          estimated_cost = ${data.estimatedCost},
          video_id = ${data.videoId || null},
          profile_name = ${data.profileName || null},
          status = ${data.status || null}
      WHERE id = ${existingId} AND user_id = ${userId}
    `;
    console.log("[CostTracking] Generation record upserted (update)");
  } catch (error: unknown) {
    console.error("[CostTracking] Failed to upsert generation record:", error);
  }
}

/**
 * Update generation status by jobId
 */
export async function updateGenerationStatus(
  jobId: string,
  status: string,
  videoId?: string
): Promise<void> {
  try {
    const userId = await requireUserId();
    
    if (videoId) {
      await sql`
        UPDATE video_generations
        SET status = ${status}, video_id = ${videoId}
        WHERE job_id = ${jobId} AND user_id = ${userId}
      `;
    } else {
      await sql`
        UPDATE video_generations
        SET status = ${status}
        WHERE job_id = ${jobId} AND user_id = ${userId}
      `;
    }
  } catch (error) {
    console.error('[CostTracking] Failed to update generation status', error);
  }
}

/**
 * Fetch active generation (running or queued)
 */
export async function fetchActiveGeneration(): Promise<GenerationRecord | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const rows = await sql`
      SELECT * FROM video_generations
      WHERE user_id = ${user.id} AND status IN ('queued', 'running')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    return rows.length > 0 ? dbRowToRecord(rows[0] as DbGenerationRow) : null;
  } catch (e) {
    console.error('[CostTracking] fetchActiveGeneration error', e);
    return null;
  }
}

/**
 * Get all generation records for the current user
 */
export async function getGenerationRecords(limit: number = 100): Promise<GenerationRecord[]> {
  try {
    const userId = await requireUserId();
    
    const rows = await sql`
      SELECT * FROM video_generations
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return (rows as DbGenerationRow[]).map(dbRowToRecord);
  } catch (error) {
    console.error('[CostTracking] Failed to get generation records', error);
    return [];
  }
}

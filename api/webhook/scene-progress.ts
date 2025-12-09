/**
 * Webhook Handler: Scene Progress Update
 *
 * Called by n8n when a scene status changes (generating, completed, etc.).
 * Provides real-time progress updates to the frontend via database polling.
 *
 * Endpoint: POST /api/webhook/scene-progress
 *
 * Deploy this as a Vercel serverless function or similar.
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_HzwxYc0l7bUG@ep-rough-base-a8o696s7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require';

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'octo-n8n-webhook-secret-2024';

const sql = neon(DATABASE_URL);

interface SceneProgressPayload {
  movie_id: string;
  scene_number: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  video_url?: string;
  audio_url?: string;
  sora_job_id?: string;
  error_message?: string;
}

export default async function handler(req: Request): Promise<Response> {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify webhook secret
  const webhookSecret = req.headers.get('x-webhook-secret');
  if (webhookSecret !== WEBHOOK_SECRET) {
    console.error('Invalid webhook secret');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const payload: SceneProgressPayload = await req.json();

    console.log('Scene progress webhook received:', payload);

    // Validate required fields
    if (!payload.movie_id || payload.scene_number === undefined || !payload.status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update the scene status
    await sql`
      UPDATE movie_scenes
      SET
        status = ${payload.status},
        video_url = COALESCE(${payload.video_url || null}, video_url),
        audio_url = COALESCE(${payload.audio_url || null}, audio_url),
        sora_job_id = COALESCE(${payload.sora_job_id || null}, sora_job_id),
        error_message = ${payload.error_message || null}
      WHERE movie_id = ${payload.movie_id}
      AND scene_number = ${payload.scene_number}
    `;

    // If scene completed, update the movie's completed_scenes count
    if (payload.status === 'completed') {
      await sql`
        UPDATE movie_projects
        SET
          completed_scenes = (
            SELECT COUNT(*) FROM movie_scenes
            WHERE movie_id = ${payload.movie_id}
            AND status = 'completed'
          ),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${payload.movie_id}
      `;
    }

    // Update job progress
    const progressResult = await sql`
      SELECT
        (SELECT COUNT(*) FROM movie_scenes WHERE movie_id = ${payload.movie_id} AND status = 'completed') as completed,
        (SELECT total_scenes FROM movie_projects WHERE id = ${payload.movie_id}) as total
    `;

    if (progressResult.length > 0) {
      const { completed, total } = progressResult[0];
      const progress = total > 0 ? Math.round((Number(completed) / Number(total)) * 100) : 0;

      await sql`
        UPDATE movie_jobs
        SET
          progress = ${progress},
          current_step = ${payload.status === 'generating' ? `Generating scene ${payload.scene_number}` : `Scene ${payload.scene_number} ${payload.status}`}
        WHERE movie_id = ${payload.movie_id}
      `;
    }

    console.log(`Scene ${payload.scene_number} of movie ${payload.movie_id} updated to ${payload.status}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Scene progress updated',
      movie_id: payload.movie_id,
      scene_number: payload.scene_number,
      status: payload.status
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Vercel Edge Function config
export const config = {
  runtime: 'edge',
};

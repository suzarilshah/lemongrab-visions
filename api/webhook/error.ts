/**
 * Webhook Handler: Scene/Movie Generation Error
 *
 * Called by n8n when scene or movie generation fails.
 * Updates the database with error information.
 *
 * Endpoint: POST /api/webhook/error
 *
 * Deploy this as a Vercel serverless function or similar.
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_HzwxYc0l7bUG@ep-rough-base-a8o696s7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require';

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'octo-n8n-webhook-secret-2024';

const sql = neon(DATABASE_URL);

interface ErrorPayload {
  movie_id: string;
  scene_number?: number;
  error: string;
  status: 'failed';
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
    const payload: ErrorPayload = await req.json();

    console.error('Error webhook received:', payload);

    // Validate required fields
    if (!payload.movie_id || !payload.error) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If scene_number is provided, update the specific scene
    if (payload.scene_number !== undefined) {
      await sql`
        UPDATE movie_scenes
        SET
          status = 'failed',
          error_message = ${payload.error}
        WHERE movie_id = ${payload.movie_id}
        AND scene_number = ${payload.scene_number}
      `;

      console.log(`Scene ${payload.scene_number} of movie ${payload.movie_id} marked as failed`);
    }

    // Update the movie project status
    await sql`
      UPDATE movie_projects
      SET
        status = 'failed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payload.movie_id}
    `;

    // Update the job record
    await sql`
      UPDATE movie_jobs
      SET
        status = 'failed',
        error_message = ${payload.error},
        completed_at = CURRENT_TIMESTAMP
      WHERE movie_id = ${payload.movie_id}
    `;

    console.log(`Movie ${payload.movie_id} marked as failed: ${payload.error}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Error recorded',
      movie_id: payload.movie_id,
      scene_number: payload.scene_number
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

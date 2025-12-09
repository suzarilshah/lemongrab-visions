/**
 * Webhook Handler: Scene/Movie Generation Error
 * Vercel Edge Function
 *
 * Called by n8n when scene or movie generation fails.
 * Endpoint: POST /api/webhook/error
 */

import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge',
};

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_HzwxYc0l7bUG@ep-rough-base-a8o696s7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require';

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'octo-n8n-webhook-secret-2024';

interface ErrorPayload {
  movie_id: string;
  scene_number?: number;
  error: string;
  status: 'failed';
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const webhookSecret = req.headers.get('x-webhook-secret');
  if (webhookSecret !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const sql = neon(DATABASE_URL);
    const payload: ErrorPayload = await req.json();

    console.error('Error webhook received:', payload);

    if (!payload.movie_id || !payload.error) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update scene if scene_number provided
    if (payload.scene_number !== undefined) {
      await sql`
        UPDATE movie_scenes
        SET status = 'failed', error_message = ${payload.error}
        WHERE movie_id = ${payload.movie_id}::uuid AND scene_number = ${payload.scene_number}
      `;
    }

    // Update movie project
    await sql`
      UPDATE movie_projects
      SET status = 'failed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payload.movie_id}::uuid
    `;

    // Update job record
    await sql`
      UPDATE movie_jobs
      SET status = 'failed', error_message = ${payload.error}, completed_at = CURRENT_TIMESTAMP
      WHERE movie_id = ${payload.movie_id}::uuid
    `;

    return new Response(JSON.stringify({
      success: true,
      message: 'Error recorded',
      movie_id: payload.movie_id
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

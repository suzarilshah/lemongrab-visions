/**
 * Webhook Handler: Movie Generation Complete
 *
 * Called by n8n when movie generation completes successfully.
 * Updates the database and can trigger notifications.
 *
 * Endpoint: POST /api/webhook/movie-complete
 *
 * Deploy this as a Vercel serverless function or similar.
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_HzwxYc0l7bUG@ep-rough-base-a8o696s7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require';

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'octo-n8n-webhook-secret-2024';

const sql = neon(DATABASE_URL);

interface MovieCompletePayload {
  movie_id: string;
  status: 'completed';
  final_video_url: string;
  download_url: string;
  completed_at: string;
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
    const payload: MovieCompletePayload = await req.json();

    console.log('Movie complete webhook received:', payload);

    // Validate required fields
    if (!payload.movie_id || !payload.final_video_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update movie project in database
    await sql`
      UPDATE movie_projects
      SET
        status = 'completed',
        final_video_url = ${payload.final_video_url},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payload.movie_id}
    `;

    // Update the associated job record
    await sql`
      UPDATE movie_jobs
      SET
        status = 'completed',
        progress = 100,
        current_step = 'Completed',
        completed_at = CURRENT_TIMESTAMP
      WHERE movie_id = ${payload.movie_id}
    `;

    console.log(`Movie ${payload.movie_id} marked as completed`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Movie completion recorded',
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

// Vercel Edge Function config
export const config = {
  runtime: 'edge',
};

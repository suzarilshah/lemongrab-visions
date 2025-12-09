/**
 * Database Migration Script for Octo Movie Generation
 * Run with: npx tsx scripts/run-migrations.ts
 */
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_HzwxYc0l7bUG@ep-rough-base-a8o696s7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // 1. Create movie_projects table
    console.log('📦 Creating movie_projects table...');
    await sql`
      CREATE TABLE IF NOT EXISTS movie_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        script TEXT NOT NULL,
        style_preferences JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'draft',
        total_scenes INTEGER DEFAULT 0,
        completed_scenes INTEGER DEFAULT 0,
        final_video_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('   ✅ movie_projects table created\n');

    // 2. Create movie_scenes table
    console.log('📦 Creating movie_scenes table...');
    await sql`
      CREATE TABLE IF NOT EXISTS movie_scenes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        movie_id UUID REFERENCES movie_projects(id) ON DELETE CASCADE,
        scene_number INTEGER NOT NULL,
        title VARCHAR(255),
        duration INTEGER,
        visual_prompt TEXT NOT NULL,
        camera_movement VARCHAR(100),
        shot_type VARCHAR(100),
        voiceover_text TEXT,
        transition VARCHAR(50) DEFAULT 'cut',
        video_url TEXT,
        audio_url TEXT,
        assembled_url TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        sora_job_id VARCHAR(255),
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('   ✅ movie_scenes table created\n');

    // 3. Create movie_jobs table
    console.log('📦 Creating movie_jobs table...');
    await sql`
      CREATE TABLE IF NOT EXISTS movie_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        movie_id UUID REFERENCES movie_projects(id),
        n8n_execution_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'queued',
        progress INTEGER DEFAULT 0,
        current_step VARCHAR(100),
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('   ✅ movie_jobs table created\n');

    // 4. Create indexes
    console.log('📦 Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_movie_scenes_movie_id ON movie_scenes(movie_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_movie_jobs_movie_id ON movie_jobs(movie_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_movie_projects_user_id ON movie_projects(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_movie_projects_status ON movie_projects(status)`;
    console.log('   ✅ All indexes created\n');

    // 5. Create ad_projects table (for Phase 2)
    console.log('📦 Creating ad_projects table...');
    await sql`
      CREATE TABLE IF NOT EXISTS ad_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        product_name VARCHAR(255),
        product_description TEXT,
        target_audience JSONB,
        ad_type VARCHAR(50),
        duration INTEGER,
        style VARCHAR(100),
        call_to_action TEXT,
        brand_colors JSONB,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('   ✅ ad_projects table created\n');

    // 6. Create ad_variants table
    console.log('📦 Creating ad_variants table...');
    await sql`
      CREATE TABLE IF NOT EXISTS ad_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ad_project_id UUID REFERENCES ad_projects(id) ON DELETE CASCADE,
        variant_name VARCHAR(100),
        format VARCHAR(50),
        aspect_ratio VARCHAR(20),
        final_video_url TEXT,
        thumbnail_url TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('   ✅ ad_variants table created\n');

    // Verify tables
    console.log('🔍 Verifying tables...');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('movie_projects', 'movie_scenes', 'movie_jobs', 'ad_projects', 'ad_variants')
      ORDER BY table_name
    `;
    console.log('   Found tables:', tables.map(t => t.table_name).join(', '));

    console.log('\n✨ All migrations completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - movie_projects: Store movie/film projects');
    console.log('   - movie_scenes: Store individual scenes');
    console.log('   - movie_jobs: Track n8n job execution');
    console.log('   - ad_projects: Store advertisement projects');
    console.log('   - ad_variants: Store ad format variants');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

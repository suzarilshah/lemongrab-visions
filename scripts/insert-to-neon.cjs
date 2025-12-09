/**
 * Insert Appwrite Data into Neon PostgreSQL
 * 
 * Run with: node scripts/insert-to-neon.cjs
 */

const fs = require('fs');
const { Client } = require('pg');

// Neon Configuration  
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_HzwxYc0l7bUG@ep-rough-base-a8o696s7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('='.repeat(60));
  console.log('Inserting Appwrite Data into Neon PostgreSQL');
  console.log('='.repeat(60));

  // Load migration data
  const migrationData = JSON.parse(fs.readFileSync('scripts/migration-data.json', 'utf-8'));
  
  // Connect to Neon
  const client = new Client({
    connectionString: NEON_CONNECTION_STRING,
  });
  
  await client.connect();
  console.log('\n✅ Connected to Neon PostgreSQL');

  try {
    // Create tables if they don't exist
    console.log('\n📋 Creating tables...');
    await createTables(client);
    
    // Insert Users
    console.log('\n📦 Inserting Users...');
    await insertUsers(client, migrationData.users);
    
    // Insert Profiles
    console.log('\n📦 Inserting Profiles...');
    await insertProfiles(client, migrationData.profiles);
    
    // Insert Video Metadata
    console.log('\n📦 Inserting Video Metadata...');
    await insertVideos(client, migrationData.videos);
    
    // Insert Video Generations
    console.log('\n📦 Inserting Video Generations...');
    await insertGenerations(client, migrationData.generations);
    
    // Verify counts
    console.log('\n' + '='.repeat(60));
    console.log('Verification - Row Counts:');
    console.log('='.repeat(60));
    
    const counts = await verifyCounts(client);
    console.log(`Users: ${counts.users}`);
    console.log(`Profiles: ${counts.profiles}`);
    console.log(`Videos: ${counts.videos}`);
    console.log(`Generations: ${counts.generations}`);
    
    console.log('\n✅ Migration complete!');
    
  } finally {
    await client.end();
  }
}

async function createTables(client) {
  // First, drop existing tables to avoid conflicts
  console.log('   Dropping existing tables...');
  await client.query(`
    DROP TABLE IF EXISTS settings CASCADE;
    DROP TABLE IF EXISTS video_generations CASCADE;
    DROP TABLE IF EXISTS video_metadata CASCADE;
    DROP TABLE IF EXISTS profiles_config CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);
  
  // Create tables SQL
  const createTablesSql = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(500) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Profiles configuration table
    CREATE TABLE IF NOT EXISTS profiles_config (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        api_key VARCHAR(500) NOT NULL,
        deployment VARCHAR(255) NOT NULL,
        sora_version VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Video metadata table
    CREATE TABLE IF NOT EXISTS video_metadata (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        appwrite_file_id VARCHAR(255),
        url TEXT NOT NULL,
        prompt TEXT,
        height VARCHAR(50),
        width VARCHAR(50),
        duration VARCHAR(50),
        sora_version VARCHAR(50) DEFAULT 'sora-1',
        azure_video_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Video generations table  
    CREATE TABLE IF NOT EXISTS video_generations (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        sora_model VARCHAR(50) NOT NULL,
        duration INTEGER NOT NULL,
        resolution VARCHAR(50) NOT NULL,
        variants INTEGER DEFAULT 1,
        generation_mode VARCHAR(50) NOT NULL,
        estimated_cost DECIMAL(10, 2) DEFAULT 0,
        video_id VARCHAR(255),
        profile_name VARCHAR(100),
        status VARCHAR(50),
        job_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Settings table (for storing user preferences)
    CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key VARCHAR(255) NOT NULL,
        value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, key)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles_config(user_id);
    CREATE INDEX IF NOT EXISTS idx_video_metadata_user_id ON video_metadata(user_id);
    CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON video_generations(user_id);
    CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

    -- Update timestamp function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Drop and recreate triggers to avoid errors
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles_config;
    CREATE TRIGGER update_profiles_updated_at
        BEFORE UPDATE ON profiles_config
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_video_metadata_updated_at ON video_metadata;
    CREATE TRIGGER update_video_metadata_updated_at
        BEFORE UPDATE ON video_metadata
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_video_generations_updated_at ON video_generations;
    CREATE TRIGGER update_video_generations_updated_at
        BEFORE UPDATE ON video_generations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
    CREATE TRIGGER update_settings_updated_at
        BEFORE UPDATE ON settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;

  await client.query(createTablesSql);
  console.log('   ✅ Tables created successfully');
}

async function insertUsers(client, users) {
  let inserted = 0;
  let skipped = 0;
  
  for (const user of users) {
    try {
      await client.query(`
        INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          name = EXCLUDED.name,
          updated_at = EXCLUDED.updated_at
      `, [
        user.$id,
        user.email,
        user.password, // Argon2 hash from Appwrite
        user.name || '',
        user.$createdAt,
        user.$updatedAt
      ]);
      inserted++;
      console.log(`   ✅ ${user.email}`);
    } catch (error) {
      console.log(`   ⚠️ Skipped ${user.email}: ${error.message}`);
      skipped++;
    }
  }
  
  console.log(`   Inserted: ${inserted}, Skipped: ${skipped}`);
}

async function insertProfiles(client, profiles) {
  let inserted = 0;
  let skipped = 0;
  
  for (const profile of profiles) {
    try {
      await client.query(`
        INSERT INTO profiles_config (id, user_id, name, endpoint, api_key, deployment, sora_version, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          endpoint = EXCLUDED.endpoint,
          api_key = EXCLUDED.api_key,
          deployment = EXCLUDED.deployment,
          sora_version = EXCLUDED.sora_version,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at
      `, [
        profile.$id,
        profile.user_id,
        profile.name,
        profile.endpoint,
        profile.api_key,
        profile.deployment,
        profile.sora_version,
        profile.is_active || false,
        profile.$createdAt,
        profile.$updatedAt
      ]);
      inserted++;
      console.log(`   ✅ ${profile.name}`);
    } catch (error) {
      console.log(`   ⚠️ Skipped ${profile.name}: ${error.message}`);
      skipped++;
    }
  }
  
  console.log(`   Inserted: ${inserted}, Skipped: ${skipped}`);
}

async function insertVideos(client, videos) {
  let inserted = 0;
  let skipped = 0;
  
  for (const video of videos) {
    try {
      await client.query(`
        INSERT INTO video_metadata (id, user_id, appwrite_file_id, url, prompt, height, width, duration, sora_version, azure_video_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          appwrite_file_id = EXCLUDED.appwrite_file_id,
          url = EXCLUDED.url,
          prompt = EXCLUDED.prompt,
          height = EXCLUDED.height,
          width = EXCLUDED.width,
          duration = EXCLUDED.duration,
          sora_version = EXCLUDED.sora_version,
          azure_video_id = EXCLUDED.azure_video_id,
          updated_at = EXCLUDED.updated_at
      `, [
        video.$id,
        video.user_id,
        video.appwrite_file_id,
        video.url,
        video.prompt,
        video.height,
        video.width,
        video.duration,
        video.sora_version || 'sora-1',
        video.azure_video_id,
        video.$createdAt,
        video.$updatedAt
      ]);
      inserted++;
      console.log(`   ✅ ${video.$id}: ${(video.prompt || 'Untitled').substring(0, 40)}...`);
    } catch (error) {
      console.log(`   ⚠️ Skipped ${video.$id}: ${error.message}`);
      skipped++;
    }
  }
  
  console.log(`   Inserted: ${inserted}, Skipped: ${skipped}`);
}

async function insertGenerations(client, generations) {
  let inserted = 0;
  let skipped = 0;
  
  // Get the first user ID to assign to generations (since generations don't have user_id in Appwrite)
  // We'll use the permissions to extract the user ID
  
  for (const gen of generations) {
    try {
      // Extract user_id from permissions like "read(\"user:68f8eab50009ec5c6269\")"
      let userId = null;
      if (gen.$permissions && gen.$permissions.length > 0) {
        const match = gen.$permissions[0].match(/user:([^"]+)/);
        if (match) {
          userId = match[1];
        }
      }
      
      if (!userId) {
        console.log(`   ⚠️ Skipped ${gen.$id}: No user_id found in permissions`);
        skipped++;
        continue;
      }
      
      await client.query(`
        INSERT INTO video_generations (id, user_id, prompt, sora_model, duration, resolution, variants, generation_mode, estimated_cost, video_id, profile_name, status, job_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          prompt = EXCLUDED.prompt,
          sora_model = EXCLUDED.sora_model,
          duration = EXCLUDED.duration,
          resolution = EXCLUDED.resolution,
          variants = EXCLUDED.variants,
          generation_mode = EXCLUDED.generation_mode,
          estimated_cost = EXCLUDED.estimated_cost,
          video_id = EXCLUDED.video_id,
          profile_name = EXCLUDED.profile_name,
          status = EXCLUDED.status,
          job_id = EXCLUDED.job_id,
          updated_at = EXCLUDED.updated_at
      `, [
        gen.$id,
        userId,
        gen.prompt,
        gen.soraModel,
        gen.duration,
        gen.resolution,
        gen.variants || 1,
        gen.generationMode,
        gen.estimatedCost || 0,
        gen.videoId || null,
        gen.profileName || null,
        gen.status || null,
        gen.jobId || null,
        gen.$createdAt,
        gen.$updatedAt
      ]);
      inserted++;
      console.log(`   ✅ ${gen.$id}: ${gen.status || 'pending'}`);
    } catch (error) {
      console.log(`   ⚠️ Skipped ${gen.$id}: ${error.message}`);
      skipped++;
    }
  }
  
  console.log(`   Inserted: ${inserted}, Skipped: ${skipped}`);
}

async function verifyCounts(client) {
  const usersResult = await client.query('SELECT COUNT(*) FROM users');
  const profilesResult = await client.query('SELECT COUNT(*) FROM profiles_config');
  const videosResult = await client.query('SELECT COUNT(*) FROM video_metadata');
  const generationsResult = await client.query('SELECT COUNT(*) FROM video_generations');
  
  return {
    users: usersResult.rows[0].count,
    profiles: profilesResult.rows[0].count,
    videos: videosResult.rows[0].count,
    generations: generationsResult.rows[0].count,
  };
}

main().catch(console.error);


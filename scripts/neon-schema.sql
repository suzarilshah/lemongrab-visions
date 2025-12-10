-- LemonGrab Database Schema for Neon PostgreSQL
-- Migration from Appwrite to Neon DB

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE (Authentication)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(128),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- 2. SESSIONS TABLE (JWT Token Management)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Index for user session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- 3. PROFILES_CONFIG TABLE (Azure API Profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    deployment VARCHAR(255) NOT NULL,
    sora_version VARCHAR(50) DEFAULT 'sora-1',
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles_config(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_active ON profiles_config(user_id, is_active);

-- ============================================
-- 4. VIDEO_METADATA TABLE (Video Records)
-- ============================================
CREATE TABLE IF NOT EXISTS video_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    height VARCHAR(50) NOT NULL,
    width VARCHAR(50) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    sora_version VARCHAR(50) DEFAULT 'sora-1',
    azure_video_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for video metadata
CREATE INDEX IF NOT EXISTS idx_video_metadata_user_id ON video_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_video_metadata_created_at ON video_metadata(created_at DESC);

-- ============================================
-- 5. VIDEO_GENERATIONS TABLE (Cost Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS video_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    sora_model VARCHAR(50) NOT NULL,
    duration INTEGER NOT NULL,
    resolution VARCHAR(50) NOT NULL,
    variants INTEGER DEFAULT 1,
    generation_mode VARCHAR(50) NOT NULL,
    estimated_cost DECIMAL(10, 4) NOT NULL,
    video_id VARCHAR(255),
    profile_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'queued',
    job_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for video generations
CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_created_at ON video_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_generations_job_id ON video_generations(job_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON video_generations(status);

-- ============================================
-- 6. HELPER FUNCTION: Update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers for updated_at
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

-- ============================================
-- 7. Row Level Security (RLS)
-- ============================================
-- Note: RLS will be enforced at the application level
-- since we're using a pooled connection string.
-- The queries will filter by user_id.

-- ============================================
-- 7. MOVIE_PROJECTS TABLE (AI Movie Generation)
-- ============================================
CREATE TABLE IF NOT EXISTS movie_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    script TEXT NOT NULL,
    style_preferences JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft',
    total_scenes INTEGER DEFAULT 0,
    completed_scenes INTEGER DEFAULT 0,
    final_video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movie_projects_user_id ON movie_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_projects_status ON movie_projects(status);

-- ============================================
-- 8. MOVIE_SCENES TABLE (Individual Scenes)
-- ============================================
CREATE TABLE IF NOT EXISTS movie_scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movie_scenes_movie_id ON movie_scenes(movie_id);

-- ============================================
-- 9. MOVIE_JOBS TABLE (n8n Job Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS movie_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES movie_projects(id) ON DELETE CASCADE,
    n8n_execution_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    current_step VARCHAR(100),
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movie_jobs_movie_id ON movie_jobs(movie_id);

-- Add triggers for movie_projects
DROP TRIGGER IF EXISTS update_movie_projects_updated_at ON movie_projects;
CREATE TRIGGER update_movie_projects_updated_at
    BEFORE UPDATE ON movie_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. EDITOR_PROJECTS TABLE (Video Timeline Editor)
-- ============================================
CREATE TABLE IF NOT EXISTS editor_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Project',
    project_data JSONB NOT NULL DEFAULT '{}',
    thumbnail_url TEXT,
    duration DECIMAL(10, 2) DEFAULT 0,
    fps INTEGER DEFAULT 30,
    resolution_width INTEGER DEFAULT 1920,
    resolution_height INTEGER DEFAULT 1080,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editor_projects_user_id ON editor_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_editor_projects_status ON editor_projects(status);
CREATE INDEX IF NOT EXISTS idx_editor_projects_updated_at ON editor_projects(updated_at DESC);

-- Add trigger for editor_projects
DROP TRIGGER IF EXISTS update_editor_projects_updated_at ON editor_projects;
CREATE TRIGGER update_editor_projects_updated_at
    BEFORE UPDATE ON editor_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Schema created successfully!' as status;



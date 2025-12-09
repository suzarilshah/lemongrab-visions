# Octo n8n Workflow Setup Guide

## Configuration Summary

This workflow is pre-configured for:
- **App Domain:** https://octo.airail.uk
- **n8n Instance:** https://n8n.suzarilshah.cf
- **Storage:** Appwrite (Sydney region)
- **Database:** Neon PostgreSQL
- **Video Generation:** Azure AI Foundry Sora 2
- **TTS:** Azure Speech Services
- **LLM:** Azure OpenAI GPT-4o

## Prerequisites

- n8n instance running at https://n8n.suzarilshah.cf
- Appwrite project `lemongrab` with bucket `octo-movies` created
- Neon PostgreSQL database with movie tables
- FFmpeg installed on n8n server

## Step 1: Import the Workflow

1. Open https://n8n.suzarilshah.cf
2. Go to **Workflows** > **Import from File**
3. Select `octo-movie-generation.json`
4. Click **Import**

## Step 2: Create Appwrite Bucket

Before using the workflow, create the storage bucket in Appwrite:

1. Go to https://cloud.appwrite.io
2. Open project `lemongrab`
3. Navigate to **Storage** > **Create Bucket**
4. Configure:
   - **Bucket ID:** `octo-movies`
   - **Name:** Octo Movies
   - **Permissions:** Set appropriate read/write permissions
   - **File Size Limit:** 500MB (or higher for longer videos)
   - **Allowed Extensions:** mp4, webm

## Step 3: Configure PostgreSQL Credential

1. Go to **Settings** > **Credentials** > **Add Credential**
2. Select **Postgres**
3. Configure:
   - **Name:** `Octo Neon Database`
   - **Credential ID:** `octo-neon-db` (important - must match!)
   - **Host:** `ep-rough-base-a8o696s7-pooler.eastus2.azure.neon.tech`
   - **Database:** `neondb`
   - **User:** `neondb_owner`
   - **Password:** `npg_HzwxYc0l7bUG`
   - **SSL:** Enable (required for Neon)

## Step 4: Database Schema

Run these SQL commands in your Neon database:

```sql
-- Movie projects table
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
);

-- Movie scenes table
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
);

-- Movie generation jobs
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
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_movie_scenes_movie_id ON movie_scenes(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_jobs_movie_id ON movie_jobs(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_projects_user_id ON movie_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_projects_status ON movie_projects(status);
```

## Step 5: Install FFmpeg on n8n Server

Ensure FFmpeg is installed on your n8n server:

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y ffmpeg

# Verify installation
ffmpeg -version
```

## Step 6: Activate the Workflow

1. Open the imported workflow
2. Click the **Active** toggle in the top-right corner
3. The workflow is now listening at: `https://n8n.suzarilshah.cf/webhook/movie/generate`

## API Endpoints

### Trigger Movie Generation

**POST** `https://n8n.suzarilshah.cf/webhook/movie/generate`

```json
{
  "movie_id": "uuid-string",
  "script": "Your movie script or story concept...",
  "style_preferences": {
    "style": "cinematic",
    "mood": "dramatic",
    "voice": "en-US-JennyNeural"
  },
  "target_scenes": 5
}
```

### Response

```json
{
  "success": true,
  "message": "Movie generation started",
  "movie_id": "uuid-string",
  "job_id": "0"
}
```

## Webhook Callbacks

Your Octo app at https://octo.airail.uk should implement these endpoints:

### POST /api/webhook/movie-complete

Called when movie generation completes:

```json
{
  "movie_id": "uuid",
  "status": "completed",
  "final_video_url": "https://syd.cloud.appwrite.io/v1/storage/buckets/octo-movies/files/{id}/view?project=lemongrab",
  "download_url": "https://syd.cloud.appwrite.io/v1/storage/buckets/octo-movies/files/{id}/download?project=lemongrab",
  "completed_at": "2024-12-09T12:00:00.000Z"
}
```

### POST /api/webhook/error

Called when a scene fails:

```json
{
  "movie_id": "uuid",
  "scene_number": 1,
  "error": "Error message",
  "status": "failed"
}
```

**Webhook Secret:** `octo-n8n-webhook-secret-2024`

Verify this header in your webhook handlers:
```
X-Webhook-Secret: octo-n8n-webhook-secret-2024
```

## Testing

### Test with cURL

```bash
curl -X POST https://n8n.suzarilshah.cf/webhook/movie/generate \
  -H "Content-Type: application/json" \
  -d '{
    "movie_id": "test-movie-001",
    "script": "A beautiful sunrise over mountain peaks. Golden light illuminates the snow-capped mountains as birds fly across the sky.",
    "style_preferences": {
      "style": "cinematic",
      "mood": "peaceful",
      "voice": "en-US-JennyNeural"
    },
    "target_scenes": 3
  }'
```

## Pre-Configured Services

### Azure AI Foundry (Sora 2)
- **Endpoint:** `https://suzar-mh225uaw-eastus2.cognitiveservices.azure.com`
- **Model:** sora-2
- **Max Duration:** 20 seconds per scene
- **Resolution:** 1280x720

### Azure OpenAI (GPT-4o)
- **Endpoint:** `https://flowfi.cognitiveservices.azure.com`
- **Deployment:** gpt-4o
- **API Version:** 2025-01-01-preview

### Azure Speech TTS
- **Region:** eastus
- **Default Voice:** en-US-JennyNeural
- **Output Format:** audio-24khz-160kbitrate-mono-mp3

### Appwrite Storage
- **Endpoint:** `https://syd.cloud.appwrite.io/v1`
- **Project:** lemongrab
- **Bucket:** octo-movies

## Available TTS Voices

| Voice Name | Gender | Style |
|------------|--------|-------|
| en-US-JennyNeural | Female | Friendly, conversational |
| en-US-GuyNeural | Male | Friendly, conversational |
| en-US-AriaNeural | Female | Professional |
| en-US-DavisNeural | Male | Professional |
| en-US-SaraNeural | Female | Cheerful |
| en-US-TonyNeural | Male | Casual |

## Voice Styles

Available styles for TTS (use in `voice_style` field):
- `friendly` (default)
- `professional`
- `dramatic`
- `calm`
- `excited`

## Troubleshooting

### Sora 2 Access Denied
- Verify your Azure AI Foundry account has Sora 2 access approved
- Check the API key is correct in the workflow

### TTS Audio Not Generated
- Verify Azure Speech region matches (eastus)
- Check voice name is valid

### FFmpeg Errors
- Ensure FFmpeg is installed: `ffmpeg -version`
- Check that `/tmp` directory is writable
- Verify video files exist before concatenation

### Appwrite Upload Fails
- Verify bucket `octo-movies` exists
- Check bucket permissions allow file uploads
- Ensure file size is within bucket limits

### Database Connection Issues
- Test connection in n8n Credentials panel
- Ensure SSL is enabled for Neon
- Verify connection string parameters

## Security Notes

1. **API Keys in Workflow:** The workflow contains hardcoded API keys. In production:
   - Use n8n environment variables
   - Or use n8n credentials with proper encryption

2. **Webhook Secret:** Always verify `X-Webhook-Secret` header in your app

3. **Appwrite Permissions:** Configure bucket permissions appropriately for your use case

## Support

For issues:
1. Check n8n execution logs
2. Check Azure Portal for API errors
3. Check Appwrite console for storage errors
4. Check PostgreSQL logs for database issues

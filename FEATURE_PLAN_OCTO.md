# Octo - AI Video Generation Platform

## Feature Plan: Text-to-Movie & Text-to-Infotainment/Advertisement

### Overview

Octo evolves from a single-video generation tool to a **full-fledged AI movie and advertisement production platform**. The new features leverage n8n workflow automation to orchestrate complex multi-scene video generation pipelines.

---

## 🎬 Feature 1: Text-to-Movie

### Concept
Transform a script, story outline, or concept into a complete multi-scene video/short film with automatic scene breakdown, video generation, audio/voiceover, and final assembly.

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           OCTO FRONTEND                                  │
│  User Input: Script/Story/Concept + Style Preferences                   │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │ POST /api/movie/create
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        N8N WORKFLOW ENGINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   WEBHOOK    │───▶│  SCRIPT      │───▶│   SCENE      │               │
│  │   TRIGGER    │    │  ANALYZER    │    │  BREAKDOWN   │               │
│  └──────────────┘    │  (GPT-4/     │    │  (GPT-4)     │               │
│                      │   Claude)    │    │              │               │
│                      └──────────────┘    └──────┬───────┘               │
│                                                  │                       │
│                      ┌───────────────────────────┼───────────────────┐  │
│                      │                           │                   │  │
│                      ▼                           ▼                   ▼  │
│               ┌──────────────┐           ┌──────────────┐    ┌──────────┐
│               │  SCENE 1     │           │  SCENE 2     │    │  SCENE N │
│               │  PROCESSOR   │           │  PROCESSOR   │    │  ...     │
│               └──────┬───────┘           └──────┬───────┘    └────┬─────┘
│                      │                          │                 │      │
│               ┌──────┴───────┐           ┌──────┴───────┐         │      │
│               │              │           │              │         │      │
│               ▼              ▼           ▼              ▼         ▼      │
│         ┌──────────┐  ┌──────────┐ ┌──────────┐  ┌──────────┐           │
│         │  SORA    │  │  TTS     │ │  SORA    │  │  TTS     │           │
│         │  VIDEO   │  │  VOICE   │ │  VIDEO   │  │  VOICE   │           │
│         │  GEN     │  │  GEN     │ │  GEN     │  │  GEN     │           │
│         └────┬─────┘  └────┬─────┘ └────┬─────┘  └────┬─────┘           │
│              │             │            │             │                  │
│              └──────┬──────┘            └──────┬──────┘                  │
│                     │                          │                         │
│                     ▼                          ▼                         │
│              ┌──────────────┐           ┌──────────────┐                 │
│              │  SCENE 1     │           │  SCENE 2     │                 │
│              │  ASSEMBLY    │           │  ASSEMBLY    │                 │
│              └──────┬───────┘           └──────┬───────┘                 │
│                     │                          │                         │
│                     └───────────┬──────────────┘                         │
│                                 ▼                                        │
│                      ┌──────────────────┐                                │
│                      │   FFMPEG         │                                │
│                      │   CONCATENATION  │                                │
│                      │   + AUDIO MIX    │                                │
│                      └────────┬─────────┘                                │
│                               │                                          │
│                               ▼                                          │
│                      ┌──────────────────┐                                │
│                      │   FINAL MOVIE    │                                │
│                      │   UPLOAD &       │                                │
│                      │   NOTIFICATION   │                                │
│                      └──────────────────┘                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Workflow Steps (Detailed)

#### Step 1: Script Analyzer (GPT-4/Claude)
```json
{
  "input": "Full script or story concept",
  "output": {
    "title": "Movie title",
    "genre": "detected genre",
    "duration_estimate": "in seconds",
    "mood": "overall mood/tone",
    "visual_style": "cinematic, documentary, animated, etc.",
    "scenes_count": 5,
    "summary": "Brief summary for metadata"
  }
}
```

#### Step 2: Scene Breakdown (GPT-4/Claude)
Prompt template:
```
You are a professional film director and storyboard artist. Break down the following script into individual scenes suitable for AI video generation.

For each scene, provide:
1. Scene number and title
2. Duration (4-20 seconds)
3. Visual description (detailed prompt for Sora)
4. Camera movement (static, pan, zoom, tracking, etc.)
5. Lighting (natural, dramatic, soft, etc.)
6. Shot type (wide, medium, close-up, aerial)
7. Voiceover/narration text (if any)
8. Transition to next scene (cut, fade, dissolve)

Script:
{user_script}

Output as JSON array.
```

#### Step 3: Parallel Video Generation
- Each scene is processed in parallel (n8n Split In Batches node)
- Sora API called for each scene's visual prompt
- TTS API (Azure Speech/ElevenLabs) for voiceover

#### Step 4: Scene Assembly
- FFmpeg combines video + audio for each scene
- Add transitions between scenes
- Apply color grading/filters if specified

#### Step 5: Final Movie Assembly
- Concatenate all scenes
- Add background music (optional)
- Add title card and credits
- Export in multiple formats (1080p, 4K)

### Database Schema Additions

```sql
-- Movie projects table
CREATE TABLE movie_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    script TEXT NOT NULL,
    style_preferences JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    total_scenes INTEGER,
    completed_scenes INTEGER DEFAULT 0,
    final_video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Movie scenes table
CREATE TABLE movie_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID REFERENCES movie_projects(id) ON DELETE CASCADE,
    scene_number INTEGER NOT NULL,
    title VARCHAR(255),
    duration INTEGER, -- seconds
    visual_prompt TEXT NOT NULL,
    camera_movement VARCHAR(100),
    shot_type VARCHAR(100),
    voiceover_text TEXT,
    transition VARCHAR(50),
    video_url TEXT,
    audio_url TEXT,
    assembled_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    sora_job_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Movie generation jobs
CREATE TABLE movie_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID REFERENCES movie_projects(id),
    n8n_execution_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📺 Feature 2: Text-to-Infotainment/Advertisement

### Concept
Generate professional advertisement and infotainment videos from product descriptions, target audience info, and style preferences.

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INPUT                                     │
│  • Product/Service Description                                          │
│  • Target Audience Demographics                                         │
│  • Ad Style (promotional, educational, testimonial, etc.)               │
│  • Duration (15s, 30s, 60s)                                            │
│  • Call-to-Action                                                       │
│  • Brand Assets (logo, colors, fonts)                                   │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     N8N AD GENERATION WORKFLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    AD SCRIPT GENERATOR (GPT-4)                    │   │
│  │                                                                   │   │
│  │  Input: Product info, audience, style, duration                  │   │
│  │  Output: Ad script with scenes, hooks, CTAs                      │   │
│  └──────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                        │
│                                 ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    SCENE VISUAL GENERATOR                         │   │
│  │                                                                   │   │
│  │  For each scene:                                                  │   │
│  │  • Generate Sora prompt optimized for ads                        │   │
│  │  • Consider brand colors/style                                   │   │
│  │  • Add motion graphics placeholders                              │   │
│  └──────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                        │
│            ┌────────────────────┼────────────────────┐                   │
│            │                    │                    │                   │
│            ▼                    ▼                    ▼                   │
│     ┌────────────┐       ┌────────────┐       ┌────────────┐            │
│     │ HOOK SCENE │       │ BODY SCENE │       │ CTA SCENE  │            │
│     │ (3-5 sec)  │       │ (varies)   │       │ (3-5 sec)  │            │
│     └─────┬──────┘       └─────┬──────┘       └─────┬──────┘            │
│           │                    │                    │                    │
│           ▼                    ▼                    ▼                    │
│     ┌────────────┐       ┌────────────┐       ┌────────────┐            │
│     │ SORA GEN   │       │ SORA GEN   │       │ SORA GEN   │            │
│     └─────┬──────┘       └─────┬──────┘       └─────┬──────┘            │
│           │                    │                    │                    │
│           └────────────────────┼────────────────────┘                   │
│                                │                                        │
│                                ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    AD ASSEMBLY ENGINE                             │   │
│  │                                                                   │   │
│  │  • Concatenate scenes                                            │   │
│  │  • Add voiceover (TTS)                                           │   │
│  │  • Overlay text/graphics (FFmpeg drawtext)                       │   │
│  │  • Add background music                                          │   │
│  │  • Add logo watermark                                            │   │
│  │  • Add CTA end card                                              │   │
│  └──────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                        │
│                                 ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    MULTI-FORMAT EXPORT                            │   │
│  │                                                                   │   │
│  │  • YouTube (16:9)                                                │   │
│  │  • Instagram/TikTok (9:16)                                       │   │
│  │  • Facebook/LinkedIn (1:1)                                       │   │
│  │  • Stories (9:16 with safe zones)                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Ad Types Supported

| Type | Duration | Structure |
|------|----------|-----------|
| **Quick Promo** | 15s | Hook (3s) → Feature (8s) → CTA (4s) |
| **Standard Ad** | 30s | Hook (5s) → Problem (5s) → Solution (10s) → Benefits (5s) → CTA (5s) |
| **Extended Ad** | 60s | Hook (5s) → Story (20s) → Features (15s) → Testimonials (10s) → CTA (10s) |
| **Infomercial** | 2-5min | Full narrative with demonstrations |

### Database Schema Additions

```sql
-- Advertisement projects
CREATE TABLE ad_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    product_name VARCHAR(255),
    product_description TEXT,
    target_audience JSONB,
    ad_type VARCHAR(50), -- quick_promo, standard, extended, infomercial
    duration INTEGER,
    style VARCHAR(100), -- promotional, educational, testimonial, cinematic
    call_to_action TEXT,
    brand_colors JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ad variants (A/B testing support)
CREATE TABLE ad_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_project_id UUID REFERENCES ad_projects(id) ON DELETE CASCADE,
    variant_name VARCHAR(100),
    format VARCHAR(50), -- landscape, portrait, square
    aspect_ratio VARCHAR(20), -- 16:9, 9:16, 1:1
    final_video_url TEXT,
    thumbnail_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 n8n Workflow Implementation

### Required n8n Nodes

1. **Webhook** - Receive requests from Octo frontend
2. **HTTP Request** - Call Azure OpenAI (GPT-4, Sora), TTS APIs
3. **Set** - Transform and prepare data
4. **IF** - Conditional logic for different paths
5. **Split In Batches** - Process scenes in parallel
6. **Merge** - Combine parallel results
7. **Code** - Custom JavaScript for FFmpeg commands
8. **Execute Command** - Run FFmpeg for video processing
9. **Wait** - Poll for Sora job completion
10. **Postgres** - Update database with progress

### n8n Workflow JSON Structure

```json
{
  "name": "Octo Movie Generation",
  "nodes": [
    {
      "id": "webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "movie/generate",
        "httpMethod": "POST"
      }
    },
    {
      "id": "script-analyzer",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.openai.com/v1/chat/completions",
        "method": "POST",
        "body": {
          "model": "gpt-4",
          "messages": [
            {
              "role": "system",
              "content": "You are a film director analyzing scripts..."
            }
          ]
        }
      }
    },
    {
      "id": "scene-generator",
      "type": "n8n-nodes-base.splitInBatches",
      "parameters": {
        "batchSize": 1
      }
    }
  ]
}
```

### Self-Hosting n8n

```yaml
# docker-compose.yml for n8n
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=octo
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
    volumes:
      - n8n_data:/home/node/.n8n
      - ./ffmpeg-scripts:/ffmpeg-scripts

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=n8n
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  n8n_data:
  postgres_data:
```

---

## 🎨 Frontend Components (New)

### Movie Studio Page
```
/studio/movie
├── Script Input (Rich text editor)
├── Style Preferences
│   ├── Visual Style (Cinematic, Documentary, Animated, etc.)
│   ├── Mood (Dramatic, Upbeat, Calm, etc.)
│   ├── Voiceover Style (Professional, Casual, Energetic)
│   └── Background Music Genre
├── Scene Preview (Storyboard view)
├── Generation Progress (Real-time updates)
└── Movie Player (Final output)
```

### Ad Studio Page
```
/studio/ad
├── Product Information Form
├── Audience Targeting
├── Ad Type Selection
├── Brand Assets Upload
├── Preview & Edit Scenes
├── Multi-Format Export
└── A/B Variant Management
```

---

## 📡 API Endpoints (New)

### Movie Endpoints
```
POST   /api/movies                  - Create new movie project
GET    /api/movies                  - List user's movies
GET    /api/movies/:id              - Get movie details
POST   /api/movies/:id/generate     - Start generation (triggers n8n)
GET    /api/movies/:id/status       - Get generation status
DELETE /api/movies/:id              - Delete movie
```

### Ad Endpoints
```
POST   /api/ads                     - Create new ad project
GET    /api/ads                     - List user's ads
GET    /api/ads/:id                 - Get ad details
POST   /api/ads/:id/generate        - Start generation
GET    /api/ads/:id/variants        - Get all format variants
DELETE /api/ads/:id                 - Delete ad
```

### n8n Webhook Endpoints (called by n8n)
```
POST   /api/webhook/scene-complete  - Scene finished processing
POST   /api/webhook/movie-complete  - Movie finished processing
POST   /api/webhook/error           - Error notification
```

---

## 🔐 Security Considerations

1. **n8n Authentication**: Use API keys for webhook authentication
2. **Rate Limiting**: Limit concurrent movie/ad generations per user
3. **Cost Control**: Set maximum scenes/duration limits
4. **Storage**: Implement cleanup for old generated files
5. **Validation**: Sanitize all user inputs before sending to LLM

---

## 📊 Estimated Costs (Per Generation)

| Component | Cost |
|-----------|------|
| GPT-4 (Script Analysis) | ~$0.10 |
| GPT-4 (Scene Breakdown) | ~$0.15 |
| Sora (per scene, avg 10s) | ~$0.50-1.00 |
| TTS (per minute) | ~$0.05 |
| FFmpeg Processing | Free (self-hosted) |
| Storage (per GB/month) | ~$0.02 |

**Estimated total per 5-scene movie**: $3-6 USD

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up n8n infrastructure
- [ ] Create basic webhook endpoints
- [ ] Implement script analyzer workflow
- [ ] Database schema migrations

### Phase 2: Movie Generation (Week 3-4)
- [ ] Scene breakdown workflow
- [ ] Parallel video generation
- [ ] FFmpeg integration
- [ ] Progress tracking system

### Phase 3: Ad Generation (Week 5-6)
- [ ] Ad script templates
- [ ] Multi-format export
- [ ] Brand asset integration
- [ ] A/B variant system

### Phase 4: Polish & Launch (Week 7-8)
- [ ] Frontend UI components
- [ ] Real-time progress updates (WebSocket)
- [ ] Error handling & retry logic
- [ ] Documentation & user guides

---

## 🎯 Success Metrics

- Movie generation success rate > 95%
- Average generation time < 10 minutes per 5-scene movie
- User satisfaction score > 4.5/5
- Cost per generation < $5

---

*Document Version: 1.0*
*Last Updated: December 2024*


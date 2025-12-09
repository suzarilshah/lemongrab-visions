# Neon Database Setup Instructions

## Overview

Octo has been migrated from Appwrite to Neon PostgreSQL. This document describes the database schema and setup instructions.

## Quick Setup

### 1. Database Connection

The database is configured in `src/lib/db.ts`. Update the `DATABASE_URL` with your Neon connection string:

```
postgresql://user:password@host.neon.tech/database?sslmode=require
```

### 2. Run Schema Migration

Execute the schema file on your Neon database:

```bash
psql 'YOUR_NEON_CONNECTION_STRING' -f scripts/neon-schema.sql
```

## Database Schema

### Tables

#### 1. `users` - User Authentication
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email address |
| password_hash | VARCHAR(255) | Bcrypt hashed password |
| name | VARCHAR(128) | User display name |
| email_verified | BOOLEAN | Email verification status |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |

#### 2. `sessions` - JWT Session Management
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| token_hash | VARCHAR(255) | Hashed JWT token |
| expires_at | TIMESTAMP | Token expiration time |
| created_at | TIMESTAMP | Session creation time |

#### 3. `profiles_config` - Azure API Profiles
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| name | VARCHAR(255) | Profile display name |
| endpoint | VARCHAR(500) | Azure OpenAI endpoint |
| api_key | VARCHAR(500) | Azure API key |
| deployment | VARCHAR(255) | Model deployment name |
| sora_version | VARCHAR(50) | 'sora-1' or 'sora-2' |
| is_active | BOOLEAN | Currently active profile |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

#### 4. `video_metadata` - Generated Video Records
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| file_id | VARCHAR(255) | External file identifier |
| url | TEXT | Video URL |
| prompt | TEXT | Generation prompt |
| height | VARCHAR(50) | Video height |
| width | VARCHAR(50) | Video width |
| duration | VARCHAR(50) | Video duration |
| sora_version | VARCHAR(50) | Model version used |
| azure_video_id | VARCHAR(255) | Azure video ID |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

#### 5. `video_generations` - Cost Tracking
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| prompt | TEXT | Generation prompt |
| sora_model | VARCHAR(50) | Model version |
| duration | INTEGER | Video duration (seconds) |
| resolution | VARCHAR(50) | Video resolution |
| variants | INTEGER | Number of variants |
| generation_mode | VARCHAR(50) | text-to-video, image-to-video, etc. |
| estimated_cost | DECIMAL(10,4) | Estimated cost |
| video_id | VARCHAR(255) | Generated video ID |
| profile_name | VARCHAR(255) | Profile used |
| status | VARCHAR(50) | queued, running, completed, failed, canceled |
| job_id | VARCHAR(255) | Azure job ID |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

## Authentication

Authentication is handled via JWT tokens:

1. **Sign Up**: Creates user with bcrypt-hashed password
2. **Login**: Verifies password, creates session, returns JWT token
3. **Session**: JWT stored in localStorage, validated on each request
4. **Logout**: Deletes session from database and localStorage

### Security Features

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with 7-day expiration
- Session tracking in database
- Password update invalidates other sessions

## Environment Variables

Create a `.env` file (or set in your deployment):

```env
# Neon Database URL
VITE_DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require

# JWT Secret (use a strong random string in production)
VITE_JWT_SECRET=your-super-secret-jwt-key-change-me-in-production
```

## Migration from Appwrite

The following Appwrite features have been replaced:

| Appwrite Feature | Neon Replacement |
|-----------------|------------------|
| Account SDK | Custom JWT auth (`src/lib/auth.ts`) |
| Databases SDK | Neon serverless client (`src/lib/db.ts`) |
| Storage | External URLs stored in video_metadata |
| Functions | Local prompt building |

## Indexes

The schema includes indexes for optimal query performance:

- `idx_users_email` - Email lookups for login
- `idx_sessions_user_id` - User session lookups
- `idx_sessions_token_hash` - Token validation
- `idx_profiles_user_id` - User profile fetching
- `idx_video_metadata_user_id` - User video listing
- `idx_video_generations_job_id` - Job status lookups

## Troubleshooting

### Connection Issues
- Verify your connection string includes `sslmode=require`
- Check that your IP is allowed in Neon dashboard

### Authentication Issues
- Clear localStorage and try logging in again
- Check browser console for JWT verification errors

### Missing Data
- Ensure the schema was run successfully
- Check that the correct database is being used



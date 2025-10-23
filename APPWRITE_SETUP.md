# Appwrite Setup Guide

This document contains instructions for setting up the required Appwrite collections and functions for the Lemongrab video generator application.

## Database Setup

### Database ID: `lemongrab_db`

### Collections

#### 1. Settings Collection
- **Collection ID**: `settings`
- **Attributes**: (Configure as needed for app settings)

#### 2. Video Generations Collection
- **Collection ID**: `video_generations`
- **Purpose**: Stores generation records for cost tracking

**Required Attributes:**
- `prompt` (String, size: 2000, required: true)
- `soraModel` (String, size: 50, required: true)
- `duration` (Integer, min: 1, max: 20, required: true)
- `resolution` (String, size: 50, required: true)
- `variants` (Integer, min: 1, max: 4, required: true)
- `generationMode` (String, size: 50, required: true)
- `estimatedCost` (Float, min: 0, required: true)
- `videoId` (String, size: 200, required: false)
- `profileName` (String, size: 100, required: false)

**Permissions:**
- Create: Users
- Read: Users
- Update: Users
- Delete: Users

## Functions Setup

### Generate Video Prompt Function

This function generates optimized video prompts using GPT-5.

#### Setup Instructions:

1. **Create Function in Appwrite Console**
   - Go to: https://syd.cloud.appwrite.io/console/project-lemongrab/functions
   - Click "Create Function"
   - **Function ID**: `generate-video-prompt`
   - **Name**: Generate Video Prompt
   - **Runtime**: Node.js 18+
   - **Entrypoint**: `index.js`
   - **Execute Access**: Any

2. **Deploy the Code**
   - Copy code from `appwrite/functions/generate-video-prompt/index.js`
   - Copy `package.json` from `appwrite/functions/generate-video-prompt/package.json`
   - In Appwrite Console > Function > Deployment tab
   - Create new deployment with both files
   - Click "Deploy"

3. **Test**
   - After deployment completes, test with sample payload (see function README)

For detailed information, see: `appwrite/functions/generate-video-prompt/README.md`

## Notes

- Make sure to create the database and collections before running the application
- Set appropriate permissions based on your security requirements
- The video_generations collection is used by the Cost Tracking feature
- The generate-video-prompt function requires no additional secrets (API key is embedded)

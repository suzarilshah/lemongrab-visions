# Generate Video Prompt Function

This Appwrite function generates optimized video prompts using GPT-5 based on structured user inputs.

## Setup Instructions

### 1. Create the Function in Appwrite Console

1. Go to your Appwrite Console: https://syd.cloud.appwrite.io/console/project-lemongrab/functions
2. Click "Create Function"
3. Configure the function:
   - **Function ID**: `generate-video-prompt`
   - **Name**: Generate Video Prompt
   - **Runtime**: Node.js 18+
   - **Entrypoint**: `index.js`
   - **Execute Access**: Any (or configure as needed)

### 2. Deploy the Code

1. Copy the contents of `index.js` and `package.json` from this directory
2. In the Appwrite Console, go to your function's "Deployment" tab
3. Create a new deployment:
   - Paste the code from `index.js` into the code editor
   - Add `package.json` as an additional file
4. Click "Deploy"

### 3. Test the Function

After deployment, you can test it with this payload:

```json
{
  "subject": "A red sports car",
  "action": "Racing through mountain roads",
  "environment": "Winding alpine mountain pass at sunset",
  "lighting": "Golden hour with dramatic shadows",
  "camera_shot": "Tracking shot",
  "camera_angle": "Low-angle",
  "camera_movement": "Following the car",
  "style": "Cinematic",
  "details": "Dramatic music, slow motion on tight turns"
}
```

### 4. CORS Configuration

The function is configured with CORS headers to allow access from your frontend. If you need to restrict access, update the `Access-Control-Allow-Origin` header in the function code.

## API Reference

### Endpoint
```
POST https://syd.cloud.appwrite.io/v1/functions/generate-video-prompt/executions
```

### Headers
```
Content-Type: application/json
X-Appwrite-Project: lemongrab
```

### Request Body
```typescript
{
  subject: string;      // Required
  action: string;       // Required
  environment?: string;
  lighting?: string;
  camera_shot?: string;
  camera_angle?: string;
  camera_movement?: string;
  style?: string;
  details?: string;
}
```

### Response
```typescript
{
  prompt: string;
}
```

## Notes

- The function uses GPT-5 API with the endpoint: `https://flowfi.cognitiveservices.azure.com`
- API key is hardcoded in the function (consider moving to environment variables for production)
- Maximum response tokens: 500
- The generated prompt is optimized for video generation models like Sora

import { Client, Storage, Databases, ID } from 'node-appwrite';

const BUCKET_ID = '68f8f4c20021c88b0a89';
const DATABASE_ID = '68fa40390030997a7a96';
const VIDEO_METADATA_COLLECTION = 'video_metadata';

export default async ({ req, res, log, error }) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Appwrite-Project, X-Appwrite-Key',
  };

  if (req.method === 'OPTIONS') {
    return res.json({}, 200, corsHeaders);
  }

  try {
    const { videoUrl, apiKey, prompt, height, width, duration, soraVersion, azureVideoId, userId } = JSON.parse(req.body);

    log('=== INGEST VIDEO FUNCTION START ===');
    log(`Received params: videoUrl=${videoUrl}`);
    log(`Azure Video ID: ${azureVideoId}, User ID: ${userId}`);
    log(`Video specs: ${width}x${height}, ${duration}s, Sora version: ${soraVersion}`);

    if (!videoUrl || !apiKey) {
      error('Missing required parameters: videoUrl and apiKey');
      return res.json({ error: 'Missing required parameters' }, 400, corsHeaders);
    }

    log(`Starting video ingestion from ${videoUrl}`);

    // Initialize Appwrite client with API key
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const storage = new Storage(client);
    const databases = new Databases(client);

    // Step 1: Download video from Azure
    log('Downloading video from Azure...');
    log(`Using API key: ${apiKey.substring(0, 10)}...`);
    const videoResponse = await fetch(videoUrl, {
      headers: { 'api-key': apiKey },
    });

    log(`Azure response status: ${videoResponse.status}`);
    
    if (!videoResponse.ok) {
      const errorText = await videoResponse.text();
      error(`Failed to download video: ${videoResponse.status} ${errorText}`);
      return res.json({ 
        error: `Failed to download video from Azure: ${videoResponse.status}`,
        details: errorText 
      }, 500, corsHeaders);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
    log(`Video downloaded successfully, size: ${videoBlob.size} bytes`);

    // Step 2: Upload to Appwrite Storage
    log('Uploading video to Appwrite Storage...');
    const fileName = `video_${Date.now()}_${azureVideoId || 'unknown'}.mp4`;
    
    // Convert Blob to File for Appwrite SDK
    const file = new File([videoBlob], fileName, { type: 'video/mp4' });
    
    const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), file);
    log(`Video uploaded to Appwrite, file ID: ${uploadedFile.$id}`);

    const appwriteUrl = `${process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1'}/storage/buckets/${BUCKET_ID}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_FUNCTION_PROJECT_ID}`;

    // Step 3: Save metadata to database
    log('Saving video metadata to database...');
    log(`Database: ${DATABASE_ID}, Collection: ${VIDEO_METADATA_COLLECTION}`);
    const metadata = await databases.createDocument(
      DATABASE_ID,
      VIDEO_METADATA_COLLECTION,
      ID.unique(),
      {
        appwrite_file_id: uploadedFile.$id,
        url: appwriteUrl,
        prompt: prompt || 'Untitled',
        height: height || '720',
        width: width || '1280',
        duration: duration || '12',
        sora_version: soraVersion || 'sora-1',
        azure_video_id: azureVideoId || null,
        user_id: userId || null,
      }
    );
    log(`Metadata saved with document ID: ${metadata.$id}`);
    log('=== INGEST VIDEO FUNCTION SUCCESS ===');

    return res.json({
      success: true,
      fileId: uploadedFile.$id,
      url: appwriteUrl,
      metadataId: metadata.$id,
    }, 200, corsHeaders);

  } catch (err) {
    error('=== INGEST VIDEO FUNCTION ERROR ===');
    error('Error details:', err.message);
    error('Stack trace:', err.stack);
    return res.json({ 
      error: err.message || 'Failed to ingest video' 
    }, 500, corsHeaders);
  }
};

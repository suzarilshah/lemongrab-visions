import { Client, Storage, Permission, Role } from 'node-appwrite';

const BUCKET_ID = '68f8f4c20021c88b0a89';

export default async ({ req, res, log, error }) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Appwrite-Project, X-Appwrite-Key',
  };

  if (req.method === 'OPTIONS') {
    return res.json({}, 200, corsHeaders);
  }

  try {
    log('=== FIX VIDEO PERMISSIONS MIGRATION START ===');

    const endpoint = req.env?.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1';
    const projectId = req.env?.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const serverApiKey = req.env?.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY;

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(serverApiKey);

    const storage = new Storage(client);

    // List all files in the bucket
    log(`Listing files in bucket ${BUCKET_ID}...`);
    const filesList = await storage.listFiles(BUCKET_ID, [], 100);
    log(`Found ${filesList.files.length} files to process`);

    const results = {
      processed: 0,
      updated: 0,
      alreadyPublic: 0,
      errors: []
    };

    // Process each file
    for (const file of filesList.files) {
      try {
        log(`Processing file: ${file.$id}`);
        
        // Check if Role.any() read permission already exists
        const hasPublicRead = file.$permissions.some(perm => 
          perm === 'read("any")' || perm.includes('read("any")')
        );

        if (hasPublicRead) {
          log(`✓ File ${file.$id} already has public read`);
          results.alreadyPublic++;
        } else {
          // Add public read permission
          const updatedPermissions = [
            ...file.$permissions,
            Permission.read(Role.any())
          ];
          
          await storage.updateFile(BUCKET_ID, file.$id, undefined, updatedPermissions);
          log(`✓ Updated file ${file.$id} with public read`);
          results.updated++;
        }
        
        results.processed++;
      } catch (err) {
        error(`✗ Failed to process file ${file.$id}: ${err.message}`);
        results.errors.push({ fileId: file.$id, error: err.message });
      }
    }

    log('=== FIX VIDEO PERMISSIONS MIGRATION COMPLETE ===');
    log(`Processed: ${results.processed}, Updated: ${results.updated}, Already public: ${results.alreadyPublic}, Errors: ${results.errors.length}`);

    return res.json({
      success: true,
      results
    }, 200, corsHeaders);

  } catch (err) {
    error('=== FIX VIDEO PERMISSIONS MIGRATION ERROR ===');
    error('Error details:', err.message);
    error('Stack trace:', err.stack);
    return res.json({ 
      error: err.message || 'Failed to fix video permissions' 
    }, 500, corsHeaders);
  }
};

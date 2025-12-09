/**
 * Migration Script: Appwrite to Neon PostgreSQL
 * 
 * This script fetches all data from Appwrite and inserts it into Neon DB.
 * Run with: node scripts/migrate-appwrite-to-neon.js
 */

const https = require('https');

// Appwrite Configuration
const APPWRITE_ENDPOINT = 'https://syd.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = 'lemongrab';
const APPWRITE_API_KEY = 'standard_152308090427d919a978590cbbff6d3a799d2f4fb0efa7cca133d2a1be2275998088baa7318ea4f83eb02909d7f13ccf0decadb95b6065e941f2e9fd31eee58e5fc5b1ee8a28714382054e8f2f820d3c604e89e7980f2ffa87b37d5daa6d205e71aeff9fdec0befa2f47c1af6e9dba1dae81c4e16070ff900d7432179e6ce3d2';

// Neon Configuration  
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_HzwxYc0l7bUG@ep-rough-base-a8o696s7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require';

// Known Database and Collection IDs from the codebase
const DATABASE_ID = '68fa40390030997a7a96';
const COLLECTIONS = {
  profiles_config: 'profiles_config',
  video_metadata: 'video_metadata',
  video_generations: 'video_generations',
};

/**
 * Make a request to Appwrite API
 */
function appwriteRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, APPWRITE_ENDPOINT);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Appwrite API error ${res.statusCode}: ${JSON.stringify(json)}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * List all documents from an Appwrite collection
 */
async function listDocuments(collectionId, limit = 100) {
  const path = `/databases/${DATABASE_ID}/collections/${collectionId}/documents?limit=${limit}`;
  console.log(`Fetching from: ${path}`);
  return appwriteRequest(path);
}

/**
 * List all users from Appwrite
 */
async function listUsers(limit = 100) {
  const path = `/users?limit=${limit}`;
  console.log(`Fetching users from: ${path}`);
  return appwriteRequest(path);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('='.repeat(60));
  console.log('Starting Appwrite to Neon Migration');
  console.log('='.repeat(60));
  
  const migrationData = {
    users: [],
    profiles: [],
    videos: [],
    generations: [],
  };

  // 1. Fetch Users from Appwrite
  console.log('\n📦 Fetching Users from Appwrite...');
  try {
    const usersResponse = await listUsers(500);
    migrationData.users = usersResponse.users || [];
    console.log(`   Found ${migrationData.users.length} users`);
    
    if (migrationData.users.length > 0) {
      console.log('   Sample user:', {
        id: migrationData.users[0].$id,
        email: migrationData.users[0].email,
        name: migrationData.users[0].name,
      });
    }
  } catch (error) {
    console.error('   Error fetching users:', error.message);
  }

  // 2. Fetch Profiles from Appwrite
  console.log('\n📦 Fetching Profiles from Appwrite...');
  try {
    const profilesResponse = await listDocuments(COLLECTIONS.profiles_config, 500);
    migrationData.profiles = profilesResponse.documents || [];
    console.log(`   Found ${migrationData.profiles.length} profiles`);
    
    if (migrationData.profiles.length > 0) {
      console.log('   Sample profile:', {
        id: migrationData.profiles[0].$id,
        name: migrationData.profiles[0].name,
        user_id: migrationData.profiles[0].user_id,
      });
    }
  } catch (error) {
    console.error('   Error fetching profiles:', error.message);
  }

  // 3. Fetch Video Metadata from Appwrite
  console.log('\n📦 Fetching Video Metadata from Appwrite...');
  try {
    const videosResponse = await listDocuments(COLLECTIONS.video_metadata, 500);
    migrationData.videos = videosResponse.documents || [];
    console.log(`   Found ${migrationData.videos.length} videos`);
    
    if (migrationData.videos.length > 0) {
      console.log('   Sample video:', {
        id: migrationData.videos[0].$id,
        prompt: migrationData.videos[0].prompt?.substring(0, 50) + '...',
        user_id: migrationData.videos[0].user_id,
      });
    }
  } catch (error) {
    console.error('   Error fetching videos:', error.message);
  }

  // 4. Fetch Video Generations from Appwrite
  console.log('\n📦 Fetching Video Generations from Appwrite...');
  try {
    const generationsResponse = await listDocuments(COLLECTIONS.video_generations, 500);
    migrationData.generations = generationsResponse.documents || [];
    console.log(`   Found ${migrationData.generations.length} generations`);
    
    if (migrationData.generations.length > 0) {
      console.log('   Sample generation:', {
        id: migrationData.generations[0].$id,
        prompt: migrationData.generations[0].prompt?.substring(0, 50) + '...',
        status: migrationData.generations[0].status,
      });
    }
  } catch (error) {
    console.error('   Error fetching generations:', error.message);
  }

  // Output migration data as JSON for the next step
  console.log('\n' + '='.repeat(60));
  console.log('Migration Data Summary:');
  console.log('='.repeat(60));
  console.log(`Users: ${migrationData.users.length}`);
  console.log(`Profiles: ${migrationData.profiles.length}`);
  console.log(`Videos: ${migrationData.videos.length}`);
  console.log(`Generations: ${migrationData.generations.length}`);

  // Write migration data to file for inspection
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/migration-data.json',
    JSON.stringify(migrationData, null, 2)
  );
  console.log('\n✅ Migration data saved to scripts/migration-data.json');

  return migrationData;
}

// Run migration
migrate().catch(console.error);



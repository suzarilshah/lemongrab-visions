/**
 * Migration Script: Appwrite to Neon PostgreSQL
 * 
 * This script fetches all data from Appwrite and inserts it into Neon DB.
 * Run with: node scripts/migrate-appwrite-to-neon.cjs
 */

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
 * Make a request to Appwrite API using fetch
 */
async function appwriteRequest(path) {
  const url = `${APPWRITE_ENDPOINT}${path}`;
  console.log(`   Fetching: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      'X-Appwrite-Key': APPWRITE_API_KEY,
    },
  });

  const text = await response.text();
  
  if (!response.ok) {
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response: ${text.substring(0, 200)}...`);
    throw new Error(`Appwrite API error ${response.status}: ${text.substring(0, 200)}`);
  }

  return JSON.parse(text);
}

/**
 * List all documents from an Appwrite collection with pagination
 */
async function listAllDocuments(collectionId) {
  let allDocuments = [];
  let hasMore = true;
  let lastId = null;
  
  while (hasMore) {
    let path = `/databases/${DATABASE_ID}/collections/${collectionId}/documents?limit=100`;
    if (lastId) {
      path += `&queries[]=cursorAfter("${lastId}")`;
    }
    
    try {
      const response = await appwriteRequest(path);
      const documents = response.documents || [];
      allDocuments = allDocuments.concat(documents);
      
      if (documents.length < 100) {
        hasMore = false;
      } else {
        lastId = documents[documents.length - 1].$id;
      }
    } catch (error) {
      console.log(`   Error fetching documents: ${error.message}`);
      hasMore = false;
    }
  }
  
  return allDocuments;
}

/**
 * List all users from Appwrite with pagination
 */
async function listAllUsers() {
  let allUsers = [];
  let hasMore = true;
  let lastId = null;
  
  while (hasMore) {
    let path = `/users?limit=100`;
    if (lastId) {
      path += `&queries[]=cursorAfter("${lastId}")`;
    }
    
    try {
      const response = await appwriteRequest(path);
      const users = response.users || [];
      allUsers = allUsers.concat(users);
      
      if (users.length < 100) {
        hasMore = false;
      } else {
        lastId = users[users.length - 1].$id;
      }
    } catch (error) {
      console.log(`   Error fetching users: ${error.message}`);
      hasMore = false;
    }
  }
  
  return allUsers;
}

/**
 * List all databases to find the correct one
 */
async function listDatabases() {
  try {
    return await appwriteRequest('/databases');
  } catch (error) {
    console.log(`   Error listing databases: ${error.message}`);
    return { databases: [] };
  }
}

/**
 * List all collections in a database
 */
async function listCollections(databaseId) {
  try {
    return await appwriteRequest(`/databases/${databaseId}/collections`);
  } catch (error) {
    console.log(`   Error listing collections: ${error.message}`);
    return { collections: [] };
  }
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
    databases: [],
    collections: {},
  };

  // 0. First, discover databases
  console.log('\n📋 Discovering Appwrite Databases...');
  const databasesResponse = await listDatabases();
  migrationData.databases = databasesResponse.databases || [];
  console.log(`   Found ${migrationData.databases.length} databases`);
  
  for (const db of migrationData.databases) {
    console.log(`   - ${db.$id}: ${db.name}`);
    
    // List collections for each database
    const collectionsResponse = await listCollections(db.$id);
    migrationData.collections[db.$id] = collectionsResponse.collections || [];
    console.log(`     Collections: ${migrationData.collections[db.$id].map(c => c.$id).join(', ')}`);
  }

  // If we found databases, use the first one with collections
  let actualDatabaseId = DATABASE_ID;
  for (const db of migrationData.databases) {
    if (migrationData.collections[db.$id]?.length > 0) {
      actualDatabaseId = db.$id;
      console.log(`\n   Using database: ${actualDatabaseId}`);
      break;
    }
  }

  // 1. Fetch Users from Appwrite
  console.log('\n📦 Fetching Users from Appwrite...');
  migrationData.users = await listAllUsers();
  console.log(`   Found ${migrationData.users.length} users`);
  
  if (migrationData.users.length > 0) {
    console.log('   Sample users:');
    migrationData.users.slice(0, 3).forEach(user => {
      console.log(`     - ${user.$id}: ${user.email} (${user.name || 'No name'})`);
    });
  }

  // 2. Fetch Profiles from Appwrite
  console.log('\n📦 Fetching Profiles from Appwrite...');
  migrationData.profiles = await listAllDocuments(COLLECTIONS.profiles_config);
  console.log(`   Found ${migrationData.profiles.length} profiles`);
  
  if (migrationData.profiles.length > 0) {
    console.log('   Sample profiles:');
    migrationData.profiles.slice(0, 3).forEach(profile => {
      console.log(`     - ${profile.$id}: ${profile.name} (user: ${profile.user_id})`);
    });
  }

  // 3. Fetch Video Metadata from Appwrite
  console.log('\n📦 Fetching Video Metadata from Appwrite...');
  migrationData.videos = await listAllDocuments(COLLECTIONS.video_metadata);
  console.log(`   Found ${migrationData.videos.length} videos`);
  
  if (migrationData.videos.length > 0) {
    console.log('   Sample videos:');
    migrationData.videos.slice(0, 3).forEach(video => {
      console.log(`     - ${video.$id}: ${(video.prompt || 'Untitled').substring(0, 40)}...`);
    });
  }

  // 4. Fetch Video Generations from Appwrite
  console.log('\n📦 Fetching Video Generations from Appwrite...');
  migrationData.generations = await listAllDocuments(COLLECTIONS.video_generations);
  console.log(`   Found ${migrationData.generations.length} generations`);
  
  if (migrationData.generations.length > 0) {
    console.log('   Sample generations:');
    migrationData.generations.slice(0, 3).forEach(gen => {
      console.log(`     - ${gen.$id}: ${gen.status} - ${(gen.prompt || 'Untitled').substring(0, 30)}...`);
    });
  }

  // Output migration data summary
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

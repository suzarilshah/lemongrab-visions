import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const client = new Client()
  .setEndpoint('https://syd.cloud.appwrite.io/v1')
  .setProject('lemongrab');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export const DATABASE_ID = 'lemongrab_db';
export const SETTINGS_COLLECTION_ID = 'settings';
export const GENERATIONS_COLLECTION_ID = 'video_generations';
export const PROFILES_COLLECTION_ID = 'profiles_config';
export const VIDEO_METADATA_COLLECTION_ID = 'video_metadata';

export { client };

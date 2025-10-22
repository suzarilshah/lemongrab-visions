import { Client, Account, Databases } from 'appwrite';

const client = new Client()
  .setEndpoint('https://syd.cloud.appwrite.io/v1')
  .setProject('lemongrab');

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = 'lemongrab_db';
export const SETTINGS_COLLECTION_ID = 'settings';

export { client };

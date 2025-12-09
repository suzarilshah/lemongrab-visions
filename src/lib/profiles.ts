/**
 * Profiles Management
 * Migrated from Appwrite to Neon PostgreSQL
 */
import { sql } from './db';
import { requireUserId, getCurrentUser } from './auth';

export type SoraVersion = "sora-1" | "sora-2";

export interface Profile {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  deployment: string;
  soraVersion: SoraVersion;
}

// Database row type
interface DbProfile {
  id: string;
  user_id: string;
  name: string;
  endpoint: string;
  api_key: string;
  deployment: string;
  sora_version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to Profile interface
 */
function dbRowToProfile(row: DbProfile): Profile {
  return {
    id: row.id,
    name: row.name,
    endpoint: row.endpoint,
    apiKey: row.api_key,
    deployment: row.deployment,
    soraVersion: row.sora_version as SoraVersion,
  };
}

/**
 * Get all profiles for the current user
 */
export async function getProfiles(): Promise<Profile[]> {
  try {
    const userId = await requireUserId();
    
    const rows = await sql`
      SELECT id, user_id, name, endpoint, api_key, deployment, sora_version, is_active, created_at, updated_at
      FROM profiles_config
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return (rows as DbProfile[]).map(dbRowToProfile);
  } catch (error: unknown) {
    console.error("[Profiles] Error fetching profiles:", error);
    return [];
  }
}

/**
 * Save (update) an existing profile
 */
export async function saveProfile(profile: Profile): Promise<void> {
  try {
    const userId = await requireUserId();
    
    await sql`
      UPDATE profiles_config
      SET name = ${profile.name}, 
          endpoint = ${profile.endpoint}, 
          api_key = ${profile.apiKey}, 
          deployment = ${profile.deployment}, 
          sora_version = ${profile.soraVersion}
      WHERE id = ${profile.id} AND user_id = ${userId}
    `;
  } catch (error: unknown) {
    console.error("[Profiles] Error saving profile:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to save profile: ${message}`);
  }
}

/**
 * Create a new profile
 */
export async function createProfile(input: Omit<Profile, "id">): Promise<Profile> {
  try {
    const userId = await requireUserId();
    
    const id = crypto.randomUUID();
    
    const rows = await sql`
      INSERT INTO profiles_config (id, user_id, name, endpoint, api_key, deployment, sora_version, is_active)
      VALUES (${id}, ${userId}, ${input.name}, ${input.endpoint}, ${input.apiKey}, ${input.deployment}, ${input.soraVersion}, false)
      RETURNING id, user_id, name, endpoint, api_key, deployment, sora_version, is_active, created_at, updated_at
    `;

    if (rows.length === 0) {
      throw new Error('Failed to create profile');
    }

    const profile = dbRowToProfile(rows[0] as DbProfile);

    // If no active profile exists, set this as active
    const activeProfile = await getActiveProfile();
    if (!activeProfile) {
      await setActiveProfile(profile.id);
    }

    return profile;
  } catch (error: unknown) {
    console.error("[Profiles] Error creating profile:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to create profile: ${message}`);
  }
}

/**
 * Delete a profile
 */
export async function deleteProfile(id: string): Promise<void> {
  try {
    const userId = await requireUserId();
    
    // Check if this is the active profile
    const activeProfile = await getActiveProfile();
    const wasActive = activeProfile?.id === id;
    
    await sql`DELETE FROM profiles_config WHERE id = ${id} AND user_id = ${userId}`;

    // If we deleted the active profile, set another one as active
    if (wasActive) {
      const profiles = await getProfiles();
      if (profiles.length > 0) {
        await setActiveProfile(profiles[0].id);
      }
    }
  } catch (error: unknown) {
    console.error("[Profiles] Error deleting profile:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to delete profile: ${message}`);
  }
}

/**
 * Set a profile as the active profile
 */
export async function setActiveProfile(id: string): Promise<void> {
  try {
    const userId = await requireUserId();
    
    // First, deactivate all user's profiles
    await sql`UPDATE profiles_config SET is_active = false WHERE user_id = ${userId}`;

    // Then activate the selected profile
    await sql`UPDATE profiles_config SET is_active = true WHERE id = ${id} AND user_id = ${userId}`;
  } catch (error: unknown) {
    console.error("[Profiles] Error setting active profile:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to set active profile: ${message}`);
  }
}

/**
 * Get the currently active profile
 */
export async function getActiveProfile(): Promise<Profile | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    // First try to get the active profile
    let rows = await sql`
      SELECT id, user_id, name, endpoint, api_key, deployment, sora_version, is_active, created_at, updated_at
      FROM profiles_config
      WHERE user_id = ${user.id} AND is_active = true
      LIMIT 1
    `;

    // If no active profile, return the first profile
    if (rows.length === 0) {
      rows = await sql`
        SELECT id, user_id, name, endpoint, api_key, deployment, sora_version, is_active, created_at, updated_at
        FROM profiles_config
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 1
      `;
    }

    if (rows.length === 0) {
      return null;
    }

    return dbRowToProfile(rows[0] as DbProfile);
  } catch (error: unknown) {
    console.error("[Profiles] Error fetching active profile:", error);
    return null;
  }
}

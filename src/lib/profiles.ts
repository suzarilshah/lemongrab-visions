import { databases, DATABASE_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";

export type SoraVersion = "sora-1" | "sora-2";

export interface Profile {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  deployment: string;
  soraVersion: SoraVersion;
}

const PROFILES_COLLECTION_ID = "profiles_config";

export async function getProfiles(): Promise<Profile[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PROFILES_COLLECTION_ID,
      [Query.orderDesc("$createdAt")]
    );
    
    return response.documents.map((doc: any) => ({
      id: doc.$id,
      name: doc.name,
      endpoint: doc.endpoint,
      apiKey: doc.api_key,
      deployment: doc.deployment,
      soraVersion: doc.sora_version as SoraVersion,
    }));
  } catch (error: any) {
    console.error("[Profiles] Error fetching profiles:", error);
    return [];
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await databases.updateDocument(
      DATABASE_ID,
      PROFILES_COLLECTION_ID,
      profile.id,
      {
        name: profile.name,
        endpoint: profile.endpoint,
        api_key: profile.apiKey,
        deployment: profile.deployment,
        sora_version: profile.soraVersion,
      }
    );
  } catch (error: any) {
    console.error("[Profiles] Error saving profile:", error);
    throw new Error(`Failed to save profile: ${error.message}`);
  }
}

export async function createProfile(input: Omit<Profile, "id">): Promise<Profile> {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      PROFILES_COLLECTION_ID,
      ID.unique(),
      {
        name: input.name,
        endpoint: input.endpoint,
        api_key: input.apiKey,
        deployment: input.deployment,
        sora_version: input.soraVersion,
        is_active: false,
      }
    );

    const profile: Profile = {
      id: response.$id,
      name: response.name,
      endpoint: response.endpoint,
      apiKey: response.api_key,
      deployment: response.deployment,
      soraVersion: response.sora_version as SoraVersion,
    };

    // If no active profile exists, set this as active
    const activeProfile = await getActiveProfile();
    if (!activeProfile) {
      await setActiveProfile(profile.id);
    }

    return profile;
  } catch (error: any) {
    console.error("[Profiles] Error creating profile:", error);
    throw new Error(`Failed to create profile: ${error.message}`);
  }
}

export async function deleteProfile(id: string): Promise<void> {
  try {
    await databases.deleteDocument(DATABASE_ID, PROFILES_COLLECTION_ID, id);
    
    const activeProfile = await getActiveProfile();
    if (activeProfile?.id === id) {
      const profiles = await getProfiles();
      if (profiles.length > 0) {
        await setActiveProfile(profiles[0].id);
      }
    }
  } catch (error: any) {
    console.error("[Profiles] Error deleting profile:", error);
    throw new Error(`Failed to delete profile: ${error.message}`);
  }
}

export async function setActiveProfile(id: string): Promise<void> {
  try {
    // First, deactivate all profiles
    const profiles = await getProfiles();
    for (const profile of profiles) {
      await databases.updateDocument(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        profile.id,
        { is_active: false }
      );
    }

    // Then activate the selected profile
    await databases.updateDocument(
      DATABASE_ID,
      PROFILES_COLLECTION_ID,
      id,
      { is_active: true }
    );
  } catch (error: any) {
    console.error("[Profiles] Error setting active profile:", error);
    throw new Error(`Failed to set active profile: ${error.message}`);
  }
}

export async function getActiveProfile(): Promise<Profile | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PROFILES_COLLECTION_ID,
      [Query.equal("is_active", true), Query.limit(1)]
    );

    if (response.documents.length === 0) {
      // No active profile, return first profile if exists
      const allProfiles = await getProfiles();
      return allProfiles[0] || null;
    }

    const doc = response.documents[0];
    return {
      id: doc.$id,
      name: doc.name,
      endpoint: doc.endpoint,
      apiKey: doc.api_key,
      deployment: doc.deployment,
      soraVersion: doc.sora_version as SoraVersion,
    };
  } catch (error: any) {
    console.error("[Profiles] Error fetching active profile:", error);
    return null;
  }
}

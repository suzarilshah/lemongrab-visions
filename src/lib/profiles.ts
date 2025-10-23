export type SoraVersion = "sora-1" | "sora-2";

export interface Profile {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  deployment: string;
  soraVersion: SoraVersion;
}

const PROFILES_KEY = "lemongrab_profiles";
const ACTIVE_PROFILE_ID_KEY = "lemongrab_active_profile";
const LEGACY_SETTINGS_KEY = "lemongrab_settings";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function getProfiles(): Profile[] {
  const raw = localStorage.getItem(PROFILES_KEY);
  const profiles: Profile[] = raw ? JSON.parse(raw) : [];
  // One-time migration from legacy settings
  const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY);
  if (legacy && profiles.length === 0) {
    try {
      const s = JSON.parse(legacy);
      const migrated: Profile = {
        id: generateId(),
        name: "Default",
        endpoint: s.endpoint || "",
        apiKey: s.apiKey || "",
        deployment: s.deployment || "",
        soraVersion: (s.soraVersion as SoraVersion) || "sora-1",
      };
      saveProfile(migrated);
      setActiveProfile(migrated.id);
      return [migrated];
    } catch {}
  }
  return profiles;
}

export function saveProfile(profile: Profile): void {
  const profiles = getProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx === -1) profiles.push(profile);
  else profiles[idx] = profile;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function createProfile(input: Omit<Profile, "id">): Profile {
  const profile: Profile = { id: generateId(), ...input };
  saveProfile(profile);
  if (!getActiveProfile()) setActiveProfile(profile.id);
  return profile;
}

export function deleteProfile(id: string): void {
  const profiles = getProfiles().filter((p) => p.id !== id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  const active = getActiveProfile();
  if (active?.id === id) {
    localStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
    if (profiles[0]) setActiveProfile(profiles[0].id);
  }
}

export function setActiveProfile(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
}

export function getActiveProfile(): Profile | null {
  const id = localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
  const profiles = getProfiles();
  const found = profiles.find((p) => p.id === id) || profiles[0];
  return found || null;
}

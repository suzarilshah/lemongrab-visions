import { databases, DATABASE_ID, GENERATIONS_COLLECTION_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";

interface GenerationData {
  prompt: string;
  soraModel: string;
  duration: number;
  resolution: string;
  variants: number;
  generationMode: string;
  estimatedCost: number;
  videoId?: string;
  profileName?: string;
  status?: string; // queued | running | completed | failed | canceled
  jobId?: string;
}


export function calculateCost(
  width: string,
  height: string,
  duration: string,
  variants: string,
  soraVersion: string
): number {
  const w = parseInt(width) || 1280;
  const h = parseInt(height) || 720;
  const d = parseInt(duration) || 12;
  const v = parseInt(variants) || 1;

  if (soraVersion === "sora-2") {
    // Sora 2 pricing: $0.10 per second
    return 0.10 * d * v;
  } else {
    // Sora 1 pricing: ~$0.05 per second per variant at 720p, scales with resolution
    const basePrice = 0.05;
    const basePixels = 1280 * 720;
    const currentPixels = w * h;
    const resolutionMultiplier = currentPixels / basePixels;
    return basePrice * d * v * resolutionMultiplier;
  }
}

export async function saveGenerationRecord(data: GenerationData): Promise<void> {
  try {
    await databases.createDocument(
      DATABASE_ID,
      GENERATIONS_COLLECTION_ID,
      ID.unique(),
      {
        prompt: data.prompt,
        soraModel: data.soraModel,
        duration: data.duration,
        resolution: data.resolution,
        variants: data.variants,
        generationMode: data.generationMode,
        estimatedCost: data.estimatedCost,
        videoId: data.videoId || null,
        profileName: data.profileName || null,
        status: data.status || null,
        jobId: data.jobId || null,
      }
    );
    console.log("[CostTracking] Generation record saved successfully");
  } catch (error: any) {
    console.error("[CostTracking] Failed to save generation record:", error);
    // Don't throw error to avoid blocking the main flow
  }
}

export async function upsertGenerationRecord(data: Required<Pick<GenerationData, 'jobId'>> & GenerationData): Promise<void> {
  try {
    if (!data.jobId) return;
    const list = await databases.listDocuments(
      DATABASE_ID,
      GENERATIONS_COLLECTION_ID,
      [Query.equal('jobId', data.jobId)]
    );

    if (list.documents.length === 0) {
      await saveGenerationRecord(data);
      return;
    }

    const doc = list.documents[0] as any;
    await databases.updateDocument(
      DATABASE_ID,
      GENERATIONS_COLLECTION_ID,
      doc.$id,
      {
        ...doc,
        prompt: data.prompt ?? doc.prompt,
        soraModel: data.soraModel ?? doc.soraModel,
        duration: data.duration ?? doc.duration,
        resolution: data.resolution ?? doc.resolution,
        variants: data.variants ?? doc.variants,
        generationMode: data.generationMode ?? doc.generationMode,
        estimatedCost: data.estimatedCost ?? doc.estimatedCost,
        videoId: data.videoId ?? doc.videoId ?? null,
        profileName: data.profileName ?? doc.profileName ?? null,
        status: data.status ?? doc.status ?? null,
        jobId: data.jobId,
      }
    );
    console.log("[CostTracking] Generation record upserted (update)");
  } catch (error: any) {
    console.error("[CostTracking] Failed to upsert generation record:", error);
  }
}

export async function updateGenerationStatus(jobId: string, status: string, patch?: Partial<GenerationData>): Promise<void> {
  try {
    const list = await databases.listDocuments(
      DATABASE_ID,
      GENERATIONS_COLLECTION_ID,
      [Query.equal('jobId', jobId)]
    );
    if (list.documents.length === 0) {
      console.warn('[CostTracking] updateGenerationStatus: no record for jobId', jobId);
      return;
    }
    const doc = list.documents[0] as any;
    await databases.updateDocument(
      DATABASE_ID,
      GENERATIONS_COLLECTION_ID,
      doc.$id,
      {
        status,
        ...(patch || {}),
      }
    );
  } catch (error) {
    console.error('[CostTracking] Failed to update generation status', error);
  }
}

export async function fetchActiveGeneration(): Promise<any | null> {
  try {
    const res = await databases.listDocuments(
      DATABASE_ID,
      GENERATIONS_COLLECTION_ID,
      [Query.contains('status', ['queued','running']), Query.orderDesc('$createdAt'), Query.limit(1)]
    );
    return res.documents[0] || null;
  } catch (e) {
    console.error('[CostTracking] fetchActiveGeneration error', e);
    return null;
  }
}


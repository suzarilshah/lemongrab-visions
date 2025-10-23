import { databases } from "@/lib/appwrite";
import { DATABASE_ID } from "@/lib/appwrite";
import { ID } from "appwrite";

const GENERATIONS_COLLECTION_ID = "video_generations";

interface GenerationData {
  prompt: string;
  soraModel: string;
  duration: number;
  resolution: string;
  variants: number;
  generationMode: string;
  estimatedCost: number;
  videoId?: string;
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
      }
    );
    console.log("[CostTracking] Generation record saved successfully");
  } catch (error: any) {
    console.error("[CostTracking] Failed to save generation record:", error);
    // Don't throw error to avoid blocking the main flow
  }
}

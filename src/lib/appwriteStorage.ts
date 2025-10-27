import { storage } from "@/lib/appwrite";
import { ID, Query } from "appwrite";

const BUCKET_ID = "68f8f4c20021c88b0a89";

export interface VideoMetadata {
  id: string;
  url: string;
  prompt: string;
  timestamp: string;
  height: string;
  width: string;
  duration: string;
  soraVersion?: string;
  azureVideoId?: string;
}


export async function uploadVideoToAppwrite(
  videoBlob: Blob,
  prompt: string,
  height: string,
  width: string,
  duration: string,
  soraVersion?: string,
  azureVideoId?: string
): Promise<VideoMetadata> {
  try {
    console.log("[Appwrite] Starting video upload...", {
      blobSize: videoBlob.size,
      blobType: videoBlob.type,
      prompt,
      dimensions: `${width}x${height}`,
      duration
    });

    const fileName = `video_${Date.now()}.mp4`;
    const file = new File([videoBlob], fileName, { type: "video/mp4" });

    console.log("[Appwrite] Uploading file to bucket:", BUCKET_ID);
    const response = await storage.createFile(BUCKET_ID, ID.unique(), file);
    console.log("[Appwrite] File uploaded successfully:", response.$id);

    const videoUrl = `https://syd.cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${response.$id}/view?project=lemongrab`;

    const metadata: VideoMetadata = {
      id: response.$id,
      url: videoUrl,
      prompt,
      timestamp: new Date().toISOString(),
      height,
      width,
      duration,
      soraVersion: soraVersion || "sora-1",
      azureVideoId,
    };
    return metadata;
  } catch (error: any) {
    console.error("[Appwrite] Upload error details:", {
      error,
      message: error?.message,
      code: error?.code,
      type: error?.type,
      response: error?.response
    });
    
    // Check if it's a CORS error
    if (error?.message === "Failed to fetch" || error?.name === "TypeError") {
      console.error("[Appwrite] CORS Error detected! Please add your domain to Appwrite CORS settings.");
      console.error("[Appwrite] Current domain:", window.location.origin);
      console.error("[Appwrite] Go to: Appwrite Console > Settings > add", window.location.origin, "to allowed platforms");
      throw new Error("CORS Error: Please add your domain to Appwrite CORS settings in the Appwrite Console");
    }
    
    throw new Error(`Failed to upload video: ${error?.message || "Unknown error"}`);
  }
}

export async function listVideosFromAppwrite(limit: number = 100): Promise<VideoMetadata[]> {
  try {
    console.log(`[Appwrite] Fetching latest ${limit} videos from video_metadata collection`);
    const { databases, DATABASE_ID } = await import("@/lib/appwrite");
    
    // Fetch from video_metadata collection instead of storage bucket directly
    const response = await databases.listDocuments(
      DATABASE_ID,
      "video_metadata",
      [
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
      ]
    );

    console.log("[Appwrite] Retrieved", response.documents.length, "videos");

    // Map documents to VideoMetadata
    const videos: VideoMetadata[] = response.documents.map((doc) => ({
      id: doc.appwrite_file_id || doc.$id,
      url: doc.url || `https://syd.cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${doc.appwrite_file_id}/view?project=lemongrab`,
      prompt: doc.prompt || 'Untitled',
      timestamp: doc.$createdAt,
      height: doc.height || '720',
      width: doc.width || '1280',
      duration: doc.duration || '12',
      soraVersion: doc.sora_version || 'sora-1',
      azureVideoId: doc.azure_video_id || undefined,
    }));

    return videos;
  } catch (error: any) {
    console.error("[Appwrite] List error details:", {
      error,
      message: error?.message,
      code: error?.code
    });

    if (error?.message === "Failed to fetch" || error?.name === "TypeError") {
      console.error("[Appwrite] CORS Error: Add", window.location.origin, "to Appwrite Console");
    }

    return [];
  }
}

export async function deleteVideoFromAppwrite(fileId: string): Promise<void> {
  try {
    console.log("[Appwrite] Deleting video:", fileId);
    await storage.deleteFile(BUCKET_ID, fileId);
    console.log("[Appwrite] Video deleted successfully");
  } catch (error: any) {
    console.error("[Appwrite] Delete error details:", {
      error,
      message: error?.message,
      fileId
    });

    if (error?.message === "Failed to fetch" || error?.name === "TypeError") {
      console.error("[Appwrite] CORS Error: Add", window.location.origin, "to Appwrite Console");
      throw new Error("CORS Error: Please add your domain to Appwrite CORS settings");
    }

    throw new Error(`Failed to delete video: ${error?.message || "Unknown error"}`);
  }
}

export async function saveVideoMetadata(metadata: VideoMetadata): Promise<void> {
  try {
    const { databases, DATABASE_ID } = await import("@/lib/appwrite");
    const { ID } = await import("appwrite");
    
    await databases.createDocument(
      DATABASE_ID,
      "video_metadata",
      ID.unique(),
      {
        appwrite_file_id: metadata.id,
        url: metadata.url,
        prompt: metadata.prompt,
        height: metadata.height,
        width: metadata.width,
        duration: metadata.duration,
        sora_version: metadata.soraVersion || "sora-1",
        azure_video_id: metadata.azureVideoId || null,
      }
    );
    console.log("[Appwrite] Video metadata saved to database");
  } catch (error: any) {
    console.error("[Appwrite] Error saving video metadata:", error);
    // Don't throw to avoid blocking the main flow
  }
}

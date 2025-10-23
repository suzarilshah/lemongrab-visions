import { storage } from "@/lib/appwrite";
import { ID } from "appwrite";

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

export async function listVideosFromAppwrite(): Promise<VideoMetadata[]> {
  try {
    console.log("[Appwrite] Fetching video list from bucket:", BUCKET_ID);
    const response = await storage.listFiles(BUCKET_ID);
    console.log("[Appwrite] Retrieved", response.files.length, "videos");
    
    // Get metadata from localStorage (since Appwrite doesn't store custom metadata easily)
    const stored = localStorage.getItem("lemongrab_video_metadata");
    const metadataMap: Record<string, VideoMetadata> = stored ? JSON.parse(stored) : {};

    return response.files.map((file) => {
      const metadata = metadataMap[file.$id];
      return metadata || {
        id: file.$id,
        url: `https://syd.cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=lemongrab`,
        prompt: "Unknown",
        timestamp: file.$createdAt,
        height: "720",
        width: "1280",
        duration: "12",
        soraVersion: "sora-1",
      };
    });
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
    
    // Remove from metadata
    const stored = localStorage.getItem("lemongrab_video_metadata");
    if (stored) {
      const metadataMap: Record<string, VideoMetadata> = JSON.parse(stored);
      delete metadataMap[fileId];
      localStorage.setItem("lemongrab_video_metadata", JSON.stringify(metadataMap));
    }
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

export function saveVideoMetadata(metadata: VideoMetadata): void {
  const stored = localStorage.getItem("lemongrab_video_metadata");
  const metadataMap: Record<string, VideoMetadata> = stored ? JSON.parse(stored) : {};
  metadataMap[metadata.id] = metadata;
  localStorage.setItem("lemongrab_video_metadata", JSON.stringify(metadataMap));
}

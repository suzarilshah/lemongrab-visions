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
}

export async function uploadVideoToAppwrite(
  videoBlob: Blob,
  prompt: string,
  height: string,
  width: string,
  duration: string
): Promise<VideoMetadata> {
  try {
    const fileName = `video_${Date.now()}.mp4`;
    const file = new File([videoBlob], fileName, { type: "video/mp4" });

    const response = await storage.createFile(BUCKET_ID, ID.unique(), file);

    const videoUrl = `https://syd.cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${response.$id}/view?project=lemongrab`;

    const metadata: VideoMetadata = {
      id: response.$id,
      url: videoUrl,
      prompt,
      timestamp: new Date().toISOString(),
      height,
      width,
      duration,
    };

    return metadata;
  } catch (error) {
    console.error("Upload error:", error);
    throw new Error("Failed to upload video to storage");
  }
}

export async function listVideosFromAppwrite(): Promise<VideoMetadata[]> {
  try {
    const response = await storage.listFiles(BUCKET_ID);
    
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
      };
    });
  } catch (error) {
    console.error("List error:", error);
    return [];
  }
}

export async function deleteVideoFromAppwrite(fileId: string): Promise<void> {
  try {
    await storage.deleteFile(BUCKET_ID, fileId);
    
    // Remove from metadata
    const stored = localStorage.getItem("lemongrab_video_metadata");
    if (stored) {
      const metadataMap: Record<string, VideoMetadata> = JSON.parse(stored);
      delete metadataMap[fileId];
      localStorage.setItem("lemongrab_video_metadata", JSON.stringify(metadataMap));
    }
  } catch (error) {
    console.error("Delete error:", error);
    throw new Error("Failed to delete video");
  }
}

export function saveVideoMetadata(metadata: VideoMetadata): void {
  const stored = localStorage.getItem("lemongrab_video_metadata");
  const metadataMap: Record<string, VideoMetadata> = stored ? JSON.parse(stored) : {};
  metadataMap[metadata.id] = metadata;
  localStorage.setItem("lemongrab_video_metadata", JSON.stringify(metadataMap));
}

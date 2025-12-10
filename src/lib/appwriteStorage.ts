/**
 * Appwrite Storage Module
 * Handles video file uploads to Appwrite bucket for persistent storage
 *
 * Azure blob storage URLs expire after 24 hours, so we upload to Appwrite
 * for permanent storage.
 */

// Appwrite configuration
const APPWRITE_ENDPOINT = 'https://syd.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = 'lemongrab';
const APPWRITE_BUCKET_ID = '68f8f4c20021c88b0a89';
const APPWRITE_API_KEY = 'standard_152308090427d919a978590cbbff6d3a799d2f4fb0efa7cca133d2a1be2275998088baa7318ea4f83eb02909d7f13ccf0decadb95b6065e941f2e9fd31eee58e5fc5b1ee8a28714382054e8f2f820d3c604e89e7980f2ffa87b37d5daa6d205e71aeff9fdec0befa2f47c1af6e9dba1dae81c4e16070ff900d7432179e6ce3d2';

export interface AppwriteFile {
  $id: string;
  bucketId: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  signature: string;
  mimeType: string;
  sizeOriginal: number;
  chunksTotal: number;
  chunksUploaded: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Generate a unique file ID
 */
function generateFileId(): string {
  return `video_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Upload a video blob to Appwrite storage
 */
export async function uploadVideoToAppwrite(
  videoBlob: Blob,
  fileName?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ fileId: string; url: string }> {
  const fileId = generateFileId();
  const finalFileName = fileName || `${fileId}.mp4`;

  // Create a File object from the Blob
  const file = new File([videoBlob], finalFileName, { type: 'video/mp4' });

  // Create FormData for the upload
  const formData = new FormData();
  formData.append('fileId', fileId);
  formData.append('file', file);

  console.log('[AppwriteStorage] Uploading video to Appwrite...', { fileId, size: videoBlob.size });

  try {
    // Use XMLHttpRequest for progress tracking
    const response = await new Promise<AppwriteFile>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (e) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          let errorMessage = `Upload failed: ${xhr.status}`;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.message || errorMessage;
          } catch {
            // Use default error message
          }
          reject(new Error(errorMessage));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files`);
      xhr.setRequestHeader('X-Appwrite-Project', APPWRITE_PROJECT_ID);
      xhr.setRequestHeader('X-Appwrite-Key', APPWRITE_API_KEY);
      xhr.send(formData);
    });

    console.log('[AppwriteStorage] Upload successful:', response.$id);

    // Construct the public URL for the file
    const url = getAppwriteFileUrl(response.$id);

    return {
      fileId: response.$id,
      url,
    };
  } catch (error) {
    console.error('[AppwriteStorage] Upload failed:', error);
    throw error;
  }
}

/**
 * Get the public URL for an Appwrite file
 */
export function getAppwriteFileUrl(fileId: string): string {
  return `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;
}

/**
 * Get the download URL for an Appwrite file
 */
export function getAppwriteDownloadUrl(fileId: string): string {
  return `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/download?project=${APPWRITE_PROJECT_ID}`;
}

/**
 * Delete a file from Appwrite storage
 */
export async function deleteVideoFromAppwrite(fileId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}`,
      {
        method: 'DELETE',
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': APPWRITE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Delete failed: ${error}`);
    }

    console.log('[AppwriteStorage] File deleted:', fileId);
    return true;
  } catch (error) {
    console.error('[AppwriteStorage] Delete failed:', error);
    return false;
  }
}

/**
 * Get file metadata from Appwrite
 */
export async function getAppwriteFileInfo(fileId: string): Promise<AppwriteFile | null> {
  try {
    const response = await fetch(
      `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}`,
      {
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': APPWRITE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[AppwriteStorage] Get file info failed:', error);
    return null;
  }
}

/**
 * List all files in the bucket
 */
export async function listAppwriteFiles(limit: number = 25): Promise<AppwriteFile[]> {
  try {
    const response = await fetch(
      `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files?limit=${limit}`,
      {
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': APPWRITE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list files');
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('[AppwriteStorage] List files failed:', error);
    return [];
  }
}

/**
 * Check if a URL is an Appwrite URL
 */
export function isAppwriteUrl(url: string): boolean {
  return url.includes('appwrite.io') || url.includes(APPWRITE_BUCKET_ID);
}

/**
 * Check if a URL is an Azure URL (temporary)
 */
export function isAzureUrl(url: string): boolean {
  return url.includes('blob.core.windows.net') || url.includes('azure') || url.includes('openai');
}

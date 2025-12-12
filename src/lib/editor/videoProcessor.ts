/**
 * Video Processor using FFmpeg.wasm
 * Handles video export with clips, transitions, and audio
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import {
  EditorProject,
  Clip,
  Track,
  Transition,
  ExportSettings,
  ExportProgress,
} from '@/types/editor';
import { getFFmpegTransitionFilter } from './transitions';
import { getActiveProfile } from '@/lib/profiles';

// ============================================
// Authenticated Video Fetching
// ============================================

/**
 * Fetch a video file with authentication for Azure URLs
 */
async function fetchVideoWithAuth(url: string): Promise<Uint8Array> {
  // Check if this is an Azure blob storage URL
  const isAzureUrl = url.includes('blob.core.windows.net') || url.includes('azure');

  if (isAzureUrl) {
    // Get the active profile for the API key
    const profile = await getActiveProfile();
    if (profile?.apiKey) {
      const response = await fetch(url, {
        headers: {
          'api-key': profile.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  }

  // For non-Azure URLs or if no profile, use standard fetch
  // Handle blob URLs specially
  if (url.startsWith('blob:')) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob video: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  // Use fetchFile for regular URLs
  return await fetchFile(url);
}

// ============================================
// FFmpeg Instance Management
// ============================================

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

export async function loadFFmpeg(
  onProgress?: (progress: number) => void
): Promise<FFmpeg> {
  if (ffmpeg && isLoaded) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  ffmpeg.on('progress', ({ progress }) => {
    onProgress?.(progress * 100);
  });

  // Load FFmpeg core from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  isLoaded = true;
  return ffmpeg;
}

export function unloadFFmpeg(): void {
  if (ffmpeg) {
    ffmpeg.terminate();
    ffmpeg = null;
    isLoaded = false;
  }
}

// ============================================
// Export Functions
// ============================================

export interface ExportResult {
  blob: Blob;
  url: string;
  duration: number;
  size: number;
}

export async function exportProject(
  project: EditorProject,
  settings: ExportSettings,
  onProgress: (progress: ExportProgress) => void
): Promise<ExportResult> {
  // Update progress
  const updateProgress = (
    stage: ExportProgress['stage'],
    progress: number,
    message?: string,
    currentClip?: number,
    totalClips?: number
  ) => {
    onProgress({ stage, progress, message, currentClip, totalClips });
  };

  updateProgress('preparing', 0, 'Loading FFmpeg...');

  // Load FFmpeg
  const ff = await loadFFmpeg((p) => {
    updateProgress('preparing', p * 0.2, 'Loading FFmpeg...');
  });

  // Collect all clips from all tracks (sorted by time)
  const allClips: Array<{ clip: Clip; track: Track }> = [];
  for (const track of project.tracks) {
    if (track.muted) continue;
    for (const clip of track.clips) {
      allClips.push({ clip, track });
    }
  }

  // Sort by start time
  allClips.sort((a, b) => a.clip.startTime - b.clip.startTime);

  if (allClips.length === 0) {
    throw new Error('No clips to export');
  }

  const totalClips = allClips.length;
  updateProgress('processing', 20, `Processing ${totalClips} clips...`, 0, totalClips);

  // Download and write each clip to FFmpeg filesystem
  const clipFiles: string[] = [];
  for (let i = 0; i < allClips.length; i++) {
    const { clip } = allClips[i];
    const filename = `clip_${i}.mp4`;

    updateProgress(
      'processing',
      20 + (i / totalClips) * 40,
      `Downloading clip ${i + 1}/${totalClips}...`,
      i + 1,
      totalClips
    );

    try {
      // Fetch the video file with authentication if needed
      const videoData = await fetchVideoWithAuth(clip.sourceUrl);
      await ff.writeFile(filename, videoData);
      clipFiles.push(filename);
    } catch (error) {
      console.error(`Failed to download clip ${i}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to download clip: ${clip.prompt?.slice(0, 30)}... (${errorMessage})`);
    }
  }

  updateProgress('encoding', 60, 'Encoding video...');

  // Build FFmpeg command
  const outputFile = 'output.mp4';

  // Simple concatenation approach (for now)
  // TODO: Add proper transition support with complex filter graphs
  if (allClips.length === 1) {
    // Single clip - just trim and export
    const { clip } = allClips[0];
    const inputArgs = ['-i', clipFiles[0]];
    const filterArgs = [
      '-ss', clip.inPoint.toString(),
      '-t', clip.duration.toString(),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', settings.quality === 'ultra' ? '18' : settings.quality === 'high' ? '22' : settings.quality === 'medium' ? '26' : '30',
      '-c:a', settings.includeAudio ? 'aac' : 'an',
      '-y',
      outputFile,
    ];

    await ff.exec([...inputArgs, ...filterArgs]);
  } else {
    // Multiple clips - create concat file
    const concatContent = clipFiles.map((f, i) => {
      const { clip } = allClips[i];
      // For proper trimming, we'd need to pre-process each clip
      // For now, just concat
      return `file '${f}'`;
    }).join('\n');

    await ff.writeFile('concat.txt', concatContent);

    // Concat with demuxer
    await ff.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', settings.quality === 'ultra' ? '18' : settings.quality === 'high' ? '22' : settings.quality === 'medium' ? '26' : '30',
      '-c:a', settings.includeAudio ? 'aac' : 'an',
      '-y',
      outputFile,
    ]);
  }

  updateProgress('finalizing', 90, 'Finalizing export...');

  // Read the output file
  const outputData = await ff.readFile(outputFile);
  // Convert FileData (Uint8Array) to a new ArrayBuffer for Blob compatibility
  const uint8Array = outputData as Uint8Array;
  const newBuffer = new ArrayBuffer(uint8Array.byteLength);
  new Uint8Array(newBuffer).set(uint8Array);
  const blob = new Blob([newBuffer], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);

  // Calculate duration
  const duration = allClips.reduce((sum, { clip }) => sum + clip.duration, 0);

  // Cleanup
  for (const file of clipFiles) {
    await ff.deleteFile(file).catch(() => {});
  }
  await ff.deleteFile('concat.txt').catch(() => {});
  await ff.deleteFile(outputFile).catch(() => {});

  updateProgress('complete', 100, 'Export complete!');

  return {
    blob,
    url,
    duration,
    size: blob.size,
  };
}

// ============================================
// Utility Functions
// ============================================

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// Export Dialog Helper
// ============================================

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'mp4',
  quality: 'high',
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  includeAudio: true,
};

export const QUALITY_PRESETS = [
  { value: 'low', label: 'Low', description: 'Smaller file size', bitrate: '1 Mbps' },
  { value: 'medium', label: 'Medium', description: 'Balanced', bitrate: '2.5 Mbps' },
  { value: 'high', label: 'High', description: 'Better quality', bitrate: '5 Mbps' },
  { value: 'ultra', label: 'Ultra', description: 'Best quality', bitrate: '10 Mbps' },
] as const;

export const RESOLUTION_PRESETS = [
  { width: 1920, height: 1080, label: '1080p (Full HD)' },
  { width: 1280, height: 720, label: '720p (HD)' },
  { width: 854, height: 480, label: '480p (SD)' },
  { width: 640, height: 360, label: '360p' },
] as const;

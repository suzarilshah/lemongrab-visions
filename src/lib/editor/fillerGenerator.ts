/**
 * AI Filler Content Generator
 * Generates AI video content to fill gaps between clips in the timeline
 */

import { EditorProject, Clip, Track } from '@/types/editor';
import { generateVideo } from '@/lib/videoGenerator';
import { getActiveProfile } from '@/lib/profiles';
import { saveVideoMetadata } from '@/lib/videoStorage';

export interface Gap {
  trackId: string;
  startTime: number;
  endTime: number;
  duration: number;
  prevClip: Clip | null;
  nextClip: Clip | null;
}

export interface FillerGenerationOptions {
  minGapDuration?: number; // Minimum gap duration to fill (seconds)
  targetDuration?: number; // Target duration for generated filler
  transitionStyle?: 'smooth' | 'dramatic' | 'match';
  resolution?: { width: number; height: number };
}

export interface FillerProgress {
  stage: 'analyzing' | 'generating_prompt' | 'generating_video' | 'complete' | 'error';
  progress: number;
  message?: string;
  gap?: Gap;
}

const DEFAULT_OPTIONS: FillerGenerationOptions = {
  minGapDuration: 2,
  targetDuration: 5,
  transitionStyle: 'smooth',
  resolution: { width: 1280, height: 720 },
};

/**
 * Find all gaps in the timeline that could be filled with AI content
 */
export function findGaps(project: EditorProject, minGapDuration: number = 2): Gap[] {
  const gaps: Gap[] = [];

  for (const track of project.tracks) {
    if (track.muted || track.locked) continue;
    if (track.clips.length === 0) continue;

    // Sort clips by start time
    const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);

    // Check gap at the beginning (if first clip doesn't start at 0)
    if (sortedClips[0].startTime > minGapDuration) {
      gaps.push({
        trackId: track.id,
        startTime: 0,
        endTime: sortedClips[0].startTime,
        duration: sortedClips[0].startTime,
        prevClip: null,
        nextClip: sortedClips[0],
      });
    }

    // Check gaps between clips
    for (let i = 0; i < sortedClips.length - 1; i++) {
      const currentClip = sortedClips[i];
      const nextClip = sortedClips[i + 1];
      const currentEnd = currentClip.startTime + currentClip.duration;
      const gapDuration = nextClip.startTime - currentEnd;

      if (gapDuration >= minGapDuration) {
        gaps.push({
          trackId: track.id,
          startTime: currentEnd,
          endTime: nextClip.startTime,
          duration: gapDuration,
          prevClip: currentClip,
          nextClip: nextClip,
        });
      }
    }
  }

  return gaps;
}

/**
 * Generate a prompt for filler content based on surrounding clips
 */
export function generateFillerPrompt(gap: Gap, style: 'smooth' | 'dramatic' | 'match' = 'smooth'): string {
  const prevPrompt = gap.prevClip?.prompt || '';
  const nextPrompt = gap.nextClip?.prompt || '';

  // If we have both clips, create a transition
  if (prevPrompt && nextPrompt) {
    switch (style) {
      case 'smooth':
        return `A smooth cinematic transition: Starting from "${prevPrompt.slice(0, 100)}" and gradually transitioning to "${nextPrompt.slice(0, 100)}". Create a seamless visual bridge between these two scenes with gentle movement and atmospheric continuity.`;

      case 'dramatic':
        return `A dramatic cinematic transition: From "${prevPrompt.slice(0, 80)}" to "${nextPrompt.slice(0, 80)}". Use dynamic camera movement, dramatic lighting changes, or visual effects to create an impactful transition between scenes.`;

      case 'match':
        // Try to extract common elements from both prompts
        const commonWords = findCommonThemes(prevPrompt, nextPrompt);
        const theme = commonWords.length > 0 ? commonWords.join(', ') : 'atmospheric';
        return `A ${theme} scene that connects "${prevPrompt.slice(0, 80)}" with "${nextPrompt.slice(0, 80)}". Maintain visual consistency with the surrounding content.`;

      default:
        return `A cinematic transition connecting two scenes. First scene: ${prevPrompt.slice(0, 100)}. Second scene: ${nextPrompt.slice(0, 100)}.`;
    }
  }

  // If we only have the previous clip
  if (prevPrompt) {
    return `Continue the visual narrative from: "${prevPrompt}". Maintain the same style, atmosphere, and visual elements while adding subtle movement and progression.`;
  }

  // If we only have the next clip
  if (nextPrompt) {
    return `A cinematic establishing shot that leads into: "${nextPrompt}". Create anticipation and visual context for the upcoming scene.`;
  }

  // Fallback - generic filler
  return 'A beautiful cinematic shot with atmospheric lighting, gentle camera movement, and high production value. Suitable for transitions between scenes.';
}

/**
 * Find common themes between two prompts
 */
function findCommonThemes(prompt1: string, prompt2: string): string[] {
  const themes = [
    'cinematic', 'dramatic', 'peaceful', 'urban', 'nature', 'night', 'day',
    'sunset', 'sunrise', 'rain', 'snow', 'ocean', 'forest', 'city', 'desert',
    'mountain', 'sky', 'clouds', 'water', 'fire', 'light', 'dark', 'colorful',
    'minimalist', 'abstract', 'realistic', 'fantasy', 'sci-fi', 'vintage', 'modern'
  ];

  const p1Lower = prompt1.toLowerCase();
  const p2Lower = prompt2.toLowerCase();

  return themes.filter(theme =>
    p1Lower.includes(theme) || p2Lower.includes(theme)
  ).slice(0, 3);
}

/**
 * Generate filler video content for a gap
 */
export async function generateFillerForGap(
  gap: Gap,
  options: FillerGenerationOptions = {},
  onProgress?: (progress: FillerProgress) => void
): Promise<{ url: string; id: string; duration: number } | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  onProgress?.({
    stage: 'analyzing',
    progress: 10,
    message: 'Analyzing gap and surrounding clips...',
    gap,
  });

  // Get active profile for API settings
  const profile = await getActiveProfile();
  if (!profile) {
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: 'No active API profile configured. Please set up your Azure settings.',
      gap,
    });
    return null;
  }

  onProgress?.({
    stage: 'generating_prompt',
    progress: 20,
    message: 'Generating AI prompt for filler content...',
    gap,
  });

  // Generate prompt based on surrounding clips
  const prompt = generateFillerPrompt(gap, opts.transitionStyle);

  // Calculate target duration (don't exceed gap duration or Sora limits)
  const targetDuration = Math.min(
    opts.targetDuration || gap.duration,
    gap.duration,
    20 // Sora max duration
  );

  onProgress?.({
    stage: 'generating_video',
    progress: 30,
    message: `Generating ${targetDuration}s filler video...`,
    gap,
  });

  try {
    let downloadUrlCapture = '';

    const result = await generateVideo({
      prompt,
      duration: Math.round(targetDuration),
      width: String(opts.resolution?.width || 1280),
      height: String(opts.resolution?.height || 720),
      variants: '1',
      endpoint: profile.endpoint,
      apiKey: profile.apiKey,
      deployment: profile.deployment,
      onProgress: (status) => {
        // Capture the download URL when it's logged
        if (status.startsWith('download_url:')) {
          downloadUrlCapture = status.replace('download_url:', '');
        }
        // Map video generation progress to our progress
        if (status.includes('%')) {
          const match = status.match(/(\d+)%/);
          if (match) {
            const genProgress = parseInt(match[1]);
            onProgress?.({
              stage: 'generating_video',
              progress: 30 + (genProgress * 0.6), // 30-90%
              message: status,
              gap,
            });
          }
        } else if (!status.startsWith('log:') && !status.startsWith('download_url:')) {
          onProgress?.({
            stage: 'generating_video',
            progress: 50,
            message: status,
            gap,
          });
        }
      },
    });

    // Save the generated video to storage
    const videoId = result.videoId || `filler-${Date.now()}`;

    // Prefer download URL for persistence, fallback to blob URL for immediate preview
    const persistentUrl = result.downloadUrl || downloadUrlCapture;
    const blobUrl = URL.createObjectURL(result.blob);

    // Save to Neon storage for persistence - use the Azure download URL
    if (persistentUrl) {
      await saveVideoMetadata({
        prompt,
        url: persistentUrl,
        duration: String(targetDuration),
        height: String(opts.resolution?.height || 720),
        width: String(opts.resolution?.width || 1280),
        variants: '1',
        soraVersion: profile.soraVersion,
        audio: false,
        jobId: videoId,
      });
    }

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Filler content generated successfully!',
      gap,
    });

    // Return the blob URL for immediate playback in timeline
    // The PreviewPlayer will handle authenticated playback via the sourceUrl
    return {
      url: blobUrl,
      id: videoId,
      duration: targetDuration,
    };
  } catch (error) {
    console.error('Failed to generate filler content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate filler content';
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: errorMessage,
      gap,
    });
    throw new Error(errorMessage); // Re-throw so the dialog can show the error
  }
}

/**
 * Generate filler content for all gaps in the timeline
 */
export async function generateAllFillers(
  project: EditorProject,
  options: FillerGenerationOptions = {},
  onProgress?: (progress: FillerProgress, gapIndex: number, totalGaps: number) => void
): Promise<Array<{ gap: Gap; result: { url: string; id: string; duration: number } | null }>> {
  const gaps = findGaps(project, options.minGapDuration);
  const results: Array<{ gap: Gap; result: { url: string; id: string; duration: number } | null }> = [];

  for (let i = 0; i < gaps.length; i++) {
    const gap = gaps[i];
    const result = await generateFillerForGap(gap, options, (progress) => {
      onProgress?.(progress, i, gaps.length);
    });
    results.push({ gap, result });
  }

  return results;
}

/**
 * Suggest filler content without generating - for preview/confirmation
 */
export function suggestFillers(
  project: EditorProject,
  options: FillerGenerationOptions = {}
): Array<{ gap: Gap; suggestedPrompt: string; suggestedDuration: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const gaps = findGaps(project, opts.minGapDuration);

  return gaps.map(gap => ({
    gap,
    suggestedPrompt: generateFillerPrompt(gap, opts.transitionStyle),
    suggestedDuration: Math.min(opts.targetDuration || gap.duration, gap.duration, 20),
  }));
}

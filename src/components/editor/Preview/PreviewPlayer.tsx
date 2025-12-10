/**
 * Preview Player Component
 * Video preview with playback controls
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { EditorProject, Clip, Track } from '@/types/editor';

interface PreviewPlayerProps {
  project: EditorProject | null;
  currentTime: number;
  isPlaying: boolean;
  playbackRate?: number;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onSetPlaying: (playing: boolean) => void;
}

export default function PreviewPlayer({
  project,
  currentTime,
  isPlaying,
  playbackRate = 1,
  onTimeChange,
  onPlayPause,
  onSetPlaying,
}: PreviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const wasPlayingRef = useRef(false);
  const lastClipIdRef = useRef<string | null>(null);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentClip, setCurrentClip] = useState<Clip | null>(null);

  // Find the active clip at current time
  // Prioritize clips from higher tracks (later in array = higher visual priority)
  // This matches standard video editor behavior where top tracks overlay bottom tracks
  const findActiveClip = useCallback((): Clip | null => {
    if (!project) return null;

    // Search tracks in reverse order - higher tracks have visual priority
    for (let i = project.tracks.length - 1; i >= 0; i--) {
      const track = project.tracks[i];
      if (track.muted) continue;
      for (const clip of track.clips) {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;
        if (currentTime >= clipStart && currentTime < clipEnd) {
          return clip;
        }
      }
    }
    return null;
  }, [project, currentTime]);

  // Update current clip when time changes
  useEffect(() => {
    const clip = findActiveClip();
    if (clip?.id !== currentClip?.id) {
      setCurrentClip(clip);
    }
  }, [findActiveClip, currentClip]);

  // Playback animation loop
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();

      const animate = (timestamp: number) => {
        const deltaMs = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        const deltaSeconds = (deltaMs / 1000) * playbackRate;
        const newTime = currentTime + deltaSeconds;

        if (project && newTime >= project.duration) {
          onSetPlaying(false);
          onTimeChange(0);
        } else {
          onTimeChange(newTime);
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTime, project, playbackRate, onTimeChange, onSetPlaying]);

  // Sync video element with clip
  useEffect(() => {
    if (!videoRef.current || !currentClip) return;

    const video = videoRef.current;

    // Check if clip changed
    const clipChanged = lastClipIdRef.current !== currentClip.id;
    if (clipChanged) {
      lastClipIdRef.current = currentClip.id;
    }

    // Load new source if clip changed
    if (video.src !== currentClip.sourceUrl) {
      video.src = currentClip.sourceUrl;
    }

    // Calculate time within the clip
    const timeInClip = currentTime - currentClip.startTime;
    const sourceTime = currentClip.inPoint + timeInClip;

    // Only seek if:
    // 1. Clip changed, OR
    // 2. We just started playing (weren't playing before), OR
    // 3. Not playing (user is scrubbing), OR
    // 4. Video is significantly out of sync (>0.5s, for error correction only)
    const justStartedPlaying = isPlaying && !wasPlayingRef.current;
    const needsSeek = clipChanged ||
                      justStartedPlaying ||
                      !isPlaying ||
                      Math.abs(video.currentTime - sourceTime) > 0.5;

    if (needsSeek) {
      video.currentTime = sourceTime;
    }

    wasPlayingRef.current = isPlaying;

    // Handle play/pause
    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }

    // Volume
    video.volume = isMuted ? 0 : (currentClip.audioEnabled ? volume : 0);

    // Playback rate
    video.playbackRate = playbackRate;
  }, [currentClip, currentTime, isPlaying, volume, isMuted, playbackRate]);

  // Format time as MM:SS:FF
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Skip backward
  const handleSkipBack = () => {
    onTimeChange(Math.max(0, currentTime - 5));
  };

  // Skip forward
  const handleSkipForward = () => {
    if (project) {
      onTimeChange(Math.min(project.duration, currentTime + 5));
    }
  };

  // Toggle mute
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Toggle fullscreen
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onPlayPause();
          break;
        case 'KeyJ':
          handleSkipBack();
          break;
        case 'KeyL':
          handleSkipForward();
          break;
        case 'KeyK':
          onSetPlaying(false);
          break;
        case 'KeyM':
          handleToggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayPause, onSetPlaying]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-card/50 rounded-xl border border-border/50 overflow-hidden"
    >
      {/* Video area */}
      <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px]">
        {currentClip ? (
          <video
            ref={videoRef}
            className="max-w-full max-h-full"
            playsInline
            muted={isMuted || !currentClip.audioEnabled}
          />
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {project?.tracks.some(t => t.clips.length > 0)
                ? 'Move playhead to preview clips'
                : 'Add clips to the timeline'}
            </p>
          </div>
        )}

        {/* Current clip info overlay */}
        {currentClip && (
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
              <p className="text-xs text-white/80 line-clamp-1">
                {currentClip.prompt?.slice(0, 50) || 'Untitled'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border/50 space-y-3">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground w-20">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            min={0}
            max={project?.duration || 60}
            step={0.033} // ~30fps precision
            className="flex-1"
            onValueChange={([value]) => onTimeChange(value)}
          />
          <span className="text-xs font-mono text-muted-foreground w-20 text-right">
            {formatTime(project?.duration || 0)}
          </span>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipBack}
              className="h-9 w-9"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={onPlayPause}
              className="h-10 w-10"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipForward}
              className="h-9 w-9"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleMute}
                className="h-8 w-8"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                min={0}
                max={100}
                step={1}
                className="w-20"
                onValueChange={([value]) => {
                  setVolume(value / 100);
                  if (value > 0) setIsMuted(false);
                }}
              />
            </div>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFullscreen}
              className="h-8 w-8"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span><kbd className="px-1 rounded bg-muted">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1 rounded bg-muted">J</kbd> Rewind</span>
          <span><kbd className="px-1 rounded bg-muted">K</kbd> Stop</span>
          <span><kbd className="px-1 rounded bg-muted">L</kbd> Forward</span>
        </div>
      </div>
    </div>
  );
}

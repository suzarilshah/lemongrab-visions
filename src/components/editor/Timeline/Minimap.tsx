/**
 * Timeline Minimap Component
 * Provides a bird's eye view of the entire timeline for quick navigation
 */

import { useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { EditorProject, Track, Clip } from '@/types/editor';

interface MinimapProps {
  project: EditorProject | null;
  currentTime: number;
  scrollLeft: number;
  viewportWidth: number;
  zoom: number;
  onTimeClick: (time: number) => void;
  onScrollTo: (scrollLeft: number) => void;
}

// Color palette for tracks
const TRACK_COLORS = [
  'rgb(99, 102, 241)', // Indigo
  'rgb(236, 72, 153)', // Pink
  'rgb(34, 197, 94)', // Green
  'rgb(251, 146, 60)', // Orange
  'rgb(168, 85, 247)', // Purple
];

export default function Minimap({
  project,
  currentTime,
  scrollLeft,
  viewportWidth,
  zoom,
  onTimeClick,
  onScrollTo,
}: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate timeline dimensions
  const timelineWidth = project ? project.duration * zoom : 0;
  const minimapWidth = containerRef.current?.clientWidth || 200;
  const scale = minimapWidth / Math.max(timelineWidth, 1);

  // Calculate viewport indicator dimensions
  const viewportIndicatorWidth = viewportWidth * scale;
  const viewportIndicatorLeft = scrollLeft * scale;

  // Calculate playhead position
  const playheadPosition = currentTime * zoom * scale;

  // Handle click on minimap
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || !project) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickRatio = clickX / rect.width;

      // Calculate the time at click position
      const time = clickRatio * project.duration;
      onTimeClick(time);

      // Also scroll the timeline to center on click position
      const targetScrollLeft = clickRatio * timelineWidth - viewportWidth / 2;
      onScrollTo(Math.max(0, targetScrollLeft));
    },
    [project, timelineWidth, viewportWidth, onTimeClick, onScrollTo]
  );

  // Handle drag on viewport indicator
  const handleDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || !project) return;

      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const moveX = moveEvent.clientX - rect.left;
        const moveRatio = moveX / rect.width;
        const targetScrollLeft = moveRatio * timelineWidth - viewportWidth / 2;
        onScrollTo(Math.max(0, Math.min(timelineWidth - viewportWidth, targetScrollLeft)));
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [project, timelineWidth, viewportWidth, onScrollTo]
  );

  // Render track clips
  const renderClips = useMemo(() => {
    if (!project) return null;

    return project.tracks.map((track, trackIndex) => {
      const trackHeight = 100 / project.tracks.length;
      const trackY = trackIndex * trackHeight;
      const color = TRACK_COLORS[trackIndex % TRACK_COLORS.length];

      return (
        <g key={track.id}>
          {track.clips.map((clip) => {
            const clipX = (clip.startTime / project.duration) * 100;
            const clipWidth = (clip.duration / project.duration) * 100;

            return (
              <rect
                key={clip.id}
                x={`${clipX}%`}
                y={`${trackY}%`}
                width={`${Math.max(clipWidth, 0.5)}%`}
                height={`${trackHeight - 2}%`}
                fill={track.muted ? 'rgba(128, 128, 128, 0.3)' : color}
                rx="1"
                className="transition-opacity"
                opacity={track.muted ? 0.3 : 0.7}
              />
            );
          })}
        </g>
      );
    });
  }, [project]);

  if (!project) return null;

  return (
    <div
      ref={containerRef}
      className="relative h-12 bg-card/80 border-b border-border/50 cursor-pointer overflow-hidden"
      onClick={handleClick}
    >
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <pattern id="minimap-grid" width="10%" height="100%" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#minimap-grid)" />
        </svg>
      </div>

      {/* Clips visualization */}
      <svg className="absolute inset-0" preserveAspectRatio="none">
        {renderClips}
      </svg>

      {/* Viewport indicator */}
      <div
        className={cn(
          'absolute top-0 h-full bg-primary/20 border-x-2 border-primary/50',
          'cursor-grab active:cursor-grabbing transition-colors',
          'hover:bg-primary/30 hover:border-primary'
        )}
        style={{
          left: `${(viewportIndicatorLeft / minimapWidth) * 100}%`,
          width: `${(viewportIndicatorWidth / minimapWidth) * 100}%`,
          minWidth: '4px',
        }}
        onMouseDown={handleDrag}
      />

      {/* Playhead */}
      <div
        className="absolute top-0 w-0.5 h-full bg-red-500 pointer-events-none z-10"
        style={{
          left: `${(playheadPosition / minimapWidth) * 100}%`,
        }}
      >
        <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
      </div>

      {/* Time markers */}
      <div className="absolute bottom-0 left-0 right-0 h-3 flex justify-between px-1 text-[8px] text-muted-foreground">
        <span>0:00</span>
        <span>{formatDuration(project.duration / 2)}</span>
        <span>{formatDuration(project.duration)}</span>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

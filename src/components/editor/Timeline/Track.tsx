/**
 * Track Component
 * Represents a single timeline track (video or audio)
 */

import { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Volume2, VolumeX, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Track as TrackType, Clip as ClipType, EDITOR_CONSTANTS } from '@/types/editor';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ClipComponent from './Clip';

interface TrackProps {
  track: TrackType;
  zoom: number;
  scrollLeft: number;
  selectedClipIds: string[];
  dragClipId: string | null;
  onSelectClip: (clipId: string, addToSelection?: boolean) => void;
  onMoveClip: (clipId: string, newStartTime: number, trackId?: string) => void;
  onTrimClip: (clipId: string, inPoint?: number, outPoint?: number, startTime?: number, duration?: number) => void;
  onStartDrag: (clipId: string, startX: number, startTime: number) => void;
  onEndDrag: () => void;
  onToggleClipAudio: (clipId: string) => void;
  onToggleMute: () => void;
  onToggleLock: () => void;
  onToggleCollapse?: () => void;
  onDelete?: () => void;
  onDropClip?: (trackId: string, time: number) => void;
  onClipDoubleClick?: (clipId: string) => void;
}

export default function Track({
  track,
  zoom,
  scrollLeft,
  selectedClipIds,
  dragClipId,
  onSelectClip,
  onMoveClip,
  onTrimClip,
  onStartDrag,
  onEndDrag,
  onToggleClipAudio,
  onToggleMute,
  onToggleLock,
  onToggleCollapse,
  onDelete,
  onDropClip,
  onClipDoubleClick,
}: TrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const trackHeight = track.collapsed ? 30 : track.height;

  // Handle click on empty track area to deselect
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (e.target === contentRef.current) {
      // Deselect clips when clicking empty area
    }
  }, []);

  // Handle drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + scrollLeft;
    const time = Math.max(0, x / zoom);
    onDropClip?.(track.id, time);
  }, [track.id, scrollLeft, zoom, onDropClip]);

  return (
    <div
      ref={trackRef}
      className={cn(
        'flex border-b border-border/50 transition-all',
        track.muted && 'opacity-60',
        track.locked && 'bg-muted/30'
      )}
      style={{ height: trackHeight }}
    >
      {/* Track header */}
      <div className="w-44 flex-shrink-0 bg-card/80 border-r border-border/50 flex items-center px-2 gap-1">
        {/* Collapse button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onToggleCollapse}
        >
          {track.collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>

        {/* Track name */}
        <span className="flex-1 text-xs font-medium truncate">{track.name}</span>

        {/* Track controls */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-6 w-6', track.muted && 'text-destructive')}
            onClick={onToggleMute}
          >
            {track.muted ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn('h-6 w-6', track.locked && 'text-primary')}
            onClick={onToggleLock}
          >
            {track.locked ? (
              <Lock className="h-3 w-3" />
            ) : (
              <Unlock className="h-3 w-3 opacity-50" />
            )}
          </Button>

          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Track content (clips area) */}
      <div
        ref={contentRef}
        className={cn(
          'flex-1 relative overflow-hidden',
          'bg-gradient-to-b from-background to-muted/20',
          track.locked && 'pointer-events-none'
        )}
        onClick={handleTrackClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Grid pattern - render based on zoom */}
          <svg className="w-full h-full" style={{ transform: `translateX(-${scrollLeft % (zoom)}px)` }}>
            <defs>
              <pattern
                id={`grid-${track.id}`}
                width={zoom}
                height={trackHeight}
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2={trackHeight} stroke="currentColor" strokeOpacity="0.05" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${track.id})`} />
          </svg>
        </div>

        {/* Clips */}
        <div
          className="absolute inset-0"
          style={{ transform: `translateX(-${scrollLeft}px)` }}
        >
          <AnimatePresence>
            {!track.collapsed && track.clips.map((clip) => (
              <ClipComponent
                key={clip.id}
                clip={clip}
                zoom={zoom}
                trackHeight={trackHeight}
                isSelected={selectedClipIds.includes(clip.id)}
                isDragging={dragClipId === clip.id}
                onSelect={onSelectClip}
                onMove={(clipId, newStartTime) => onMoveClip(clipId, newStartTime)}
                onTrim={onTrimClip}
                onStartDrag={onStartDrag}
                onEndDrag={onEndDrag}
                onToggleAudio={onToggleClipAudio}
                onDoubleClick={onClipDoubleClick}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty track hint */}
        {track.clips.length === 0 && !track.collapsed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-muted-foreground">
              Drag videos here
            </p>
          </div>
        )}

        {/* Collapsed indicator */}
        {track.collapsed && track.clips.length > 0 && (
          <div className="absolute inset-0 flex items-center px-4">
            <span className="text-xs text-muted-foreground">
              {track.clips.length} clip{track.clips.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

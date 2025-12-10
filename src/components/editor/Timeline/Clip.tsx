/**
 * Clip Component
 * Represents a video clip on the timeline
 */

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, GripVertical } from 'lucide-react';
import { Clip as ClipType, EDITOR_CONSTANTS } from '@/types/editor';
import { cn } from '@/lib/utils';

interface ClipProps {
  clip: ClipType;
  zoom: number;
  trackHeight: number;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: (clipId: string, addToSelection?: boolean) => void;
  onMove: (clipId: string, newStartTime: number) => void;
  onTrim: (clipId: string, inPoint?: number, outPoint?: number, startTime?: number, duration?: number) => void;
  onStartDrag: (clipId: string, startX: number, startTime: number) => void;
  onEndDrag: () => void;
  onToggleAudio: (clipId: string) => void;
  onDoubleClick?: (clipId: string) => void;
}

export default function ClipComponent({
  clip,
  zoom,
  trackHeight,
  isSelected,
  isDragging,
  onSelect,
  onMove,
  onTrim,
  onStartDrag,
  onEndDrag,
  onToggleAudio,
  onDoubleClick,
}: ClipProps) {
  const clipRef = useRef<HTMLDivElement>(null);
  const [isTrimming, setIsTrimming] = useState<'left' | 'right' | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const width = clip.duration * zoom;
  const left = clip.startTime * zoom;

  // Handle clip selection
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(clip.id, e.shiftKey || e.metaKey);
  }, [clip.id, onSelect]);

  // Handle double click
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.(clip.id);
  }, [clip.id, onDoubleClick]);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isTrimming) return;
    e.preventDefault();

    const startX = e.clientX;
    const startTime = clip.startTime;

    onStartDrag(clip.id, startX, startTime);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / zoom;
      const newStartTime = Math.max(0, startTime + deltaTime);
      onMove(clip.id, newStartTime);
    };

    const handleMouseUp = () => {
      onEndDrag();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [clip.id, clip.startTime, zoom, isTrimming, onStartDrag, onMove, onEndDrag]);

  // Handle left trim
  const handleLeftTrim = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsTrimming('left');

    const startX = e.clientX;
    const initialStartTime = clip.startTime;
    const initialInPoint = clip.inPoint;
    const initialDuration = clip.duration;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / zoom;

      // Calculate new values
      const newStartTime = Math.max(0, initialStartTime + deltaTime);
      const newInPoint = Math.max(0, Math.min(clip.outPoint - EDITOR_CONSTANTS.MIN_CLIP_DURATION, initialInPoint + deltaTime));
      const newDuration = Math.max(EDITOR_CONSTANTS.MIN_CLIP_DURATION, initialDuration - deltaTime);

      onTrim(clip.id, newInPoint, undefined, newStartTime, newDuration);
    };

    const handleMouseUp = () => {
      setIsTrimming(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [clip, zoom, onTrim]);

  // Handle right trim
  const handleRightTrim = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsTrimming('right');

    const startX = e.clientX;
    const initialDuration = clip.duration;
    const initialOutPoint = clip.outPoint;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / zoom;

      // Calculate new values
      const newDuration = Math.max(EDITOR_CONSTANTS.MIN_CLIP_DURATION, initialDuration + deltaTime);
      const newOutPoint = Math.min(clip.sourceDuration, Math.max(clip.inPoint + EDITOR_CONSTANTS.MIN_CLIP_DURATION, initialOutPoint + deltaTime));

      onTrim(clip.id, undefined, newOutPoint, undefined, newDuration);
    };

    const handleMouseUp = () => {
      setIsTrimming(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [clip, zoom, onTrim]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      ref={clipRef}
      className={cn(
        'absolute top-1 rounded-md cursor-move overflow-hidden group',
        'bg-gradient-to-b from-primary/80 to-primary/60',
        'border-2 transition-all',
        isSelected ? 'border-white shadow-lg shadow-primary/30' : 'border-primary/30',
        isDragging && 'opacity-75 scale-[1.02]'
      )}
      style={{
        left,
        width: Math.max(width, 30),
        height: trackHeight - 8,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      initial={false}
      animate={{
        opacity: isDragging ? 0.75 : 1,
      }}
    >
      {/* Left trim handle */}
      <div
        className={cn(
          'absolute left-0 top-0 w-2 h-full cursor-ew-resize z-10',
          'bg-yellow-400/0 hover:bg-yellow-400/80 transition-colors',
          isTrimming === 'left' && 'bg-yellow-400'
        )}
        onMouseDown={handleLeftTrim}
      />

      {/* Right trim handle */}
      <div
        className={cn(
          'absolute right-0 top-0 w-2 h-full cursor-ew-resize z-10',
          'bg-yellow-400/0 hover:bg-yellow-400/80 transition-colors',
          isTrimming === 'right' && 'bg-yellow-400'
        )}
        onMouseDown={handleRightTrim}
      />

      {/* Thumbnail/Preview */}
      {clip.thumbnailUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${clip.thumbnailUrl})` }}
        />
      )}

      {/* Content */}
      <div className="relative h-full flex items-center px-3 pointer-events-none">
        {/* Drag handle */}
        {isHovering && (
          <GripVertical className="h-4 w-4 text-white/50 mr-1 flex-shrink-0" />
        )}

        {/* Clip info */}
        {width > 60 && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {clip.prompt?.slice(0, 30) || 'Untitled'}
            </p>
            {width > 120 && (
              <p className="text-[10px] text-white/70">
                {formatDuration(clip.duration)}
              </p>
            )}
          </div>
        )}

        {/* Audio indicator */}
        {width > 40 && (
          <button
            className="ml-auto pointer-events-auto p-1 rounded hover:bg-white/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAudio(clip.id);
            }}
          >
            {clip.audioEnabled ? (
              <Volume2 className="h-3 w-3 text-white/70" />
            ) : (
              <VolumeX className="h-3 w-3 text-white/50" />
            )}
          </button>
        )}
      </div>

      {/* Waveform placeholder */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/20">
        <svg className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M0,8 Q10,2 20,8 T40,8 T60,8 T80,8 T100,8"
            stroke="rgba(255,255,255,0.3)"
            fill="none"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* Selection glow */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-white rounded-md animate-pulse pointer-events-none" />
      )}
    </motion.div>
  );
}

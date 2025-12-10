/**
 * Clip Component
 * Represents a video clip on the timeline - optimized for smooth dragging
 */

import { useRef, useState, useCallback, useEffect } from 'react';
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
  const [localPosition, setLocalPosition] = useState<number | null>(null);
  const dragRef = useRef<{
    startX: number;
    startTime: number;
    isDragging: boolean;
  } | null>(null);

  // Use local position during drag for smooth updates, otherwise use clip.startTime
  const displayLeft = localPosition !== null ? localPosition * zoom : clip.startTime * zoom;
  const width = clip.duration * zoom;

  // Reset local position when clip changes externally
  useEffect(() => {
    if (!dragRef.current?.isDragging) {
      setLocalPosition(null);
    }
  }, [clip.startTime]);

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

  // Handle drag start - optimized for smooth dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isTrimming) return;
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startTime = clip.startTime;

    dragRef.current = { startX, startTime, isDragging: true };
    onStartDrag(clip.id, startX, startTime);
    setLocalPosition(startTime);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;

      const deltaX = moveEvent.clientX - dragRef.current.startX;
      const deltaTime = deltaX / zoom;
      const newStartTime = Math.max(0, dragRef.current.startTime + deltaTime);

      // Update local position for immediate visual feedback
      setLocalPosition(newStartTime);

      // Throttle the actual state update for performance
      requestAnimationFrame(() => {
        onMove(clip.id, newStartTime);
      });
    };

    const handleMouseUp = () => {
      if (dragRef.current) {
        dragRef.current.isDragging = false;
        dragRef.current = null;
      }
      setLocalPosition(null);
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
    <div
      ref={clipRef}
      className={cn(
        'absolute top-1 rounded-md cursor-grab active:cursor-grabbing overflow-hidden group',
        'bg-gradient-to-b from-primary/80 to-primary/60',
        'border-2',
        isSelected ? 'border-white shadow-lg shadow-primary/30 z-10' : 'border-primary/30',
        isDragging && 'opacity-80 z-20',
        isTrimming && 'z-20'
      )}
      style={{
        left: displayLeft,
        width: Math.max(width, 30),
        height: trackHeight - 8,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        willChange: isDragging ? 'left, transform' : 'auto',
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Left trim handle */}
      <div
        className={cn(
          'absolute left-0 top-0 w-3 h-full cursor-ew-resize z-10',
          'bg-yellow-400/0 hover:bg-yellow-400/80 transition-colors',
          'flex items-center justify-center',
          isTrimming === 'left' && 'bg-yellow-400'
        )}
        onMouseDown={handleLeftTrim}
      >
        <div className="w-0.5 h-6 bg-yellow-400/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Right trim handle */}
      <div
        className={cn(
          'absolute right-0 top-0 w-3 h-full cursor-ew-resize z-10',
          'bg-yellow-400/0 hover:bg-yellow-400/80 transition-colors',
          'flex items-center justify-center',
          isTrimming === 'right' && 'bg-yellow-400'
        )}
        onMouseDown={handleRightTrim}
      >
        <div className="w-0.5 h-6 bg-yellow-400/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Thumbnail/Preview */}
      {clip.thumbnailUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${clip.thumbnailUrl})` }}
        />
      )}

      {/* Content */}
      <div className="relative h-full flex items-center px-3 pointer-events-none select-none">
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

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-white/50 rounded-md pointer-events-none" />
      )}
    </div>
  );
}

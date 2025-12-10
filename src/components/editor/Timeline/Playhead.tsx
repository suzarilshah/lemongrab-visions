/**
 * Playhead Component
 * Red line indicating current playback position
 */

import { useRef, useCallback } from 'react';
import { EDITOR_CONSTANTS } from '@/types/editor';

interface PlayheadProps {
  currentTime: number;
  zoom: number;
  scrollLeft: number;
  height: number;
  onTimeChange: (time: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function Playhead({
  currentTime,
  zoom,
  scrollLeft,
  height,
  onTimeChange,
  onDragStart,
  onDragEnd,
}: PlayheadProps) {
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Add TRACK_HEADER_WIDTH offset so playhead aligns with clips (which are in the content area after the header)
  const position = EDITOR_CONSTANTS.TRACK_HEADER_WIDTH + currentTime * zoom - scrollLeft;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    onDragStart?.();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const container = containerRef.current.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // Subtract TRACK_HEADER_WIDTH to get position relative to clip content area
      const x = moveEvent.clientX - rect.left - EDITOR_CONSTANTS.TRACK_HEADER_WIDTH + scrollLeft;
      const time = Math.max(0, x / zoom);
      onTimeChange(time);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      onDragEnd?.();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [scrollLeft, zoom, onTimeChange, onDragStart, onDragEnd]);

  // Don't render if off-screen (account for header width)
  if (position < EDITOR_CONSTANTS.TRACK_HEADER_WIDTH - 20 || position > window.innerWidth + 20) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-0 z-30 cursor-col-resize group"
      style={{
        left: position,
        height: height,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Wider hit area for easier dragging - invisible but captures events */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 pointer-events-auto" />

      {/* Handle - larger and more visible */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-500 rounded-sm shadow-lg hover:bg-red-400 group-hover:scale-110 transition-all pointer-events-auto cursor-grab active:cursor-grabbing">
        <div className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-red-500" />
      </div>

      {/* Line - also draggable with wider hit area */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-3 bg-transparent pointer-events-auto"
        style={{ top: 16, height: height - 16 }}
      >
        {/* Visible line */}
        <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-red-500" />
      </div>
    </div>
  );
}

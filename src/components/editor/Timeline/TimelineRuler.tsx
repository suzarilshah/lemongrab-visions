/**
 * Timeline Ruler Component
 * Shows time markers above the timeline
 */

import { useMemo } from 'react';
import { EDITOR_CONSTANTS } from '@/types/editor';

interface TimelineRulerProps {
  zoom: number;
  duration: number;
  scrollLeft: number;
  width: number;
  currentTime: number;
  onTimeClick: (time: number) => void;
}

export default function TimelineRuler({
  zoom,
  duration,
  scrollLeft,
  width,
  currentTime,
  onTimeClick,
}: TimelineRulerProps) {
  // Calculate visible time range
  const startTime = scrollLeft / zoom;
  const visibleDuration = width / zoom;
  const endTime = startTime + visibleDuration;

  // Calculate marker interval based on zoom level
  const markerInterval = useMemo(() => {
    if (zoom >= 200) return 0.5; // Every 0.5 seconds
    if (zoom >= 100) return 1; // Every second
    if (zoom >= 50) return 2; // Every 2 seconds
    if (zoom >= 25) return 5; // Every 5 seconds
    return 10; // Every 10 seconds
  }, [zoom]);

  // Generate markers
  const markers = useMemo(() => {
    const result: { time: number; isMajor: boolean }[] = [];
    const start = Math.floor(startTime / markerInterval) * markerInterval;
    const majorInterval = markerInterval * 5;

    for (let time = start; time <= endTime + markerInterval; time += markerInterval) {
      if (time >= 0 && time <= duration + EDITOR_CONSTANTS.TIMELINE_PADDING / zoom) {
        result.push({
          time,
          isMajor: time % majorInterval === 0,
        });
      }
    }
    return result;
  }, [startTime, endTime, markerInterval, duration, zoom]);

  // Format time as MM:SS.ms
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);

    if (zoom >= 100) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Subtract track header width to get position relative to timeline content
    const x = e.clientX - rect.left - EDITOR_CONSTANTS.TRACK_HEADER_WIDTH + scrollLeft;
    const time = x / zoom;
    onTimeClick(Math.max(0, time));
  };

  return (
    <div
      className="relative h-8 bg-card/80 border-b border-border/50 cursor-pointer select-none"
      onClick={handleClick}
    >
      {/* Empty space to align with track headers */}
      <div className="absolute left-0 top-0 h-full bg-card/80 border-r border-border/50" style={{ width: EDITOR_CONSTANTS.TRACK_HEADER_WIDTH }} />

      {/* Markers - offset by track header width */}
      <div
        className="absolute inset-0"
        style={{
          left: EDITOR_CONSTANTS.TRACK_HEADER_WIDTH,
          transform: `translateX(-${scrollLeft}px)`,
        }}
      >
        {markers.map(({ time, isMajor }) => (
          <div
            key={time}
            className="absolute top-0 h-full"
            style={{ left: time * zoom }}
          >
            {/* Tick mark */}
            <div
              className={`absolute bottom-0 w-px ${
                isMajor ? 'h-4 bg-muted-foreground' : 'h-2 bg-border'
              }`}
            />
            {/* Time label */}
            {isMajor && (
              <span className="absolute bottom-2 left-1 text-[10px] text-muted-foreground whitespace-nowrap">
                {formatTime(time)}
              </span>
            )}
          </div>
        ))}

        {/* Current time indicator */}
        <div
          className="absolute top-0 h-full w-0.5 bg-red-500 z-10"
          style={{ left: currentTime * zoom }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
        </div>
      </div>
    </div>
  );
}

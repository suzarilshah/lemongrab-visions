/**
 * Timeline Component
 * Main timeline container with tracks, ruler, and playhead
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ZoomIn, ZoomOut, Magnet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  EditorProject,
  Track as TrackType,
  Clip,
  SnapLine,
  EDITOR_CONSTANTS,
} from '@/types/editor';
import TimelineRuler from './TimelineRuler';
import Track from './Track';
import Playhead from './Playhead';

interface TimelineProps {
  project: EditorProject | null;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  scrollLeft: number;
  selectedClipIds: string[];
  dragClipId: string | null;
  snapEnabled: boolean;
  snapLines: SnapLine[];

  // Actions
  onSetCurrentTime: (time: number) => void;
  onSetZoom: (zoom: number) => void;
  onSetScroll: (scroll: { left?: number; top?: number }) => void;
  onSelectClip: (clipId: string, addToSelection?: boolean) => void;
  onDeselectAll: () => void;
  onMoveClip: (clipId: string, newStartTime: number, trackId?: string) => void;
  onTrimClip: (clipId: string, inPoint?: number, outPoint?: number, startTime?: number, duration?: number) => void;
  onStartDrag: (clipId: string, startX: number, startTime: number) => void;
  onEndDrag: () => void;
  onToggleClipAudio: (clipId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackLock: (trackId: string) => void;
  onUpdateTrack: (trackId: string, updates: Partial<TrackType>) => void;
  onAddTrack: () => void;
  onRemoveTrack: (trackId: string) => void;
  onDropClip?: (trackId: string, time: number, mediaItem: any) => void;
  onToggleSnap: () => void;
  onClipDoubleClick?: (clipId: string) => void;
}

export default function Timeline({
  project,
  currentTime,
  isPlaying,
  zoom,
  scrollLeft,
  selectedClipIds,
  dragClipId,
  snapEnabled,
  snapLines,
  onSetCurrentTime,
  onSetZoom,
  onSetScroll,
  onSelectClip,
  onDeselectAll,
  onMoveClip,
  onTrimClip,
  onStartDrag,
  onEndDrag,
  onToggleClipAudio,
  onToggleTrackMute,
  onToggleTrackLock,
  onUpdateTrack,
  onAddTrack,
  onRemoveTrack,
  onDropClip,
  onToggleSnap,
  onClipDoubleClick,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  // Update container width on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    onSetScroll({ left: target.scrollLeft, top: target.scrollTop });
  }, [onSetScroll]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      onSetZoom(zoom + delta);
    }
  }, [zoom, onSetZoom]);

  // Handle click on empty area
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === tracksContainerRef.current) {
      onDeselectAll();
    }
  }, [onDeselectAll]);

  // Handle drop from media library
  const handleDrop = useCallback((trackId: string, time: number) => {
    // This will be handled by the parent component
    onDropClip?.(trackId, time, null);
  }, [onDropClip]);

  // Calculate total tracks height
  const totalTracksHeight = project?.tracks.reduce((sum, track) => {
    return sum + (track.collapsed ? 30 : track.height);
  }, 0) || 0;

  // Calculate timeline width - ensure enough space for all clips plus room to add more
  // The timeline should always extend beyond the rightmost clip
  const timelineWidth = Math.max(
    containerWidth,
    (project?.duration || 60) * zoom + EDITOR_CONSTANTS.TIMELINE_PADDING * 2
  );

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center bg-card/50 rounded-xl border border-border/50">
        <p className="text-muted-foreground">No project loaded</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-card/50 rounded-xl border border-border/50 overflow-hidden"
    >
      {/* Timeline toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/80">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAddTrack}
          >
            <Plus className="h-4 w-4 mr-1" />
            Track
          </Button>

          <div className="h-4 w-px bg-border mx-2" />

          <Button
            variant={snapEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleSnap}
            className={cn(snapEnabled && 'bg-primary text-primary-foreground')}
          >
            <Magnet className="h-4 w-4 mr-1" />
            Snap
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onSetZoom(zoom - 20)}
            disabled={zoom <= EDITOR_CONSTANTS.MIN_ZOOM}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <Slider
            value={[zoom]}
            min={EDITOR_CONSTANTS.MIN_ZOOM}
            max={EDITOR_CONSTANTS.MAX_ZOOM}
            step={5}
            className="w-32"
            onValueChange={([value]) => onSetZoom(value)}
          />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onSetZoom(zoom + 20)}
            disabled={zoom >= EDITOR_CONSTANTS.MAX_ZOOM}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <span className="text-xs text-muted-foreground w-12 text-right">
            {Math.round(zoom)}%
          </span>
        </div>
      </div>

      {/* Timeline ruler */}
      <TimelineRuler
        zoom={zoom}
        duration={project.duration}
        scrollLeft={scrollLeft}
        width={containerWidth}
        currentTime={currentTime}
        onTimeClick={onSetCurrentTime}
      />

      {/* Tracks container */}
      <div
        ref={tracksContainerRef}
        className="flex-1 overflow-auto relative"
        onScroll={handleScroll}
        onWheel={handleWheel}
        onClick={handleContainerClick}
      >
        <div
          className="relative"
          style={{
            width: timelineWidth,
            minHeight: '100%',
          }}
        >
          {/* Tracks */}
          <div className="relative">
            {project.tracks.map((track) => (
              <Track
                key={track.id}
                track={track}
                zoom={zoom}
                scrollLeft={scrollLeft}
                selectedClipIds={selectedClipIds}
                dragClipId={dragClipId}
                onSelectClip={onSelectClip}
                onMoveClip={onMoveClip}
                onTrimClip={onTrimClip}
                onStartDrag={onStartDrag}
                onEndDrag={onEndDrag}
                onToggleClipAudio={onToggleClipAudio}
                onToggleMute={() => onToggleTrackMute(track.id)}
                onToggleLock={() => onToggleTrackLock(track.id)}
                onToggleCollapse={() => onUpdateTrack(track.id, { collapsed: !track.collapsed })}
                onDelete={project.tracks.length > 1 ? () => onRemoveTrack(track.id) : undefined}
                onDropClip={handleDrop}
                onClipDoubleClick={onClipDoubleClick}
              />
            ))}
          </div>

          {/* Playhead */}
          <Playhead
            currentTime={currentTime}
            zoom={zoom}
            scrollLeft={scrollLeft}
            height={totalTracksHeight}
            onTimeChange={onSetCurrentTime}
            onDragStart={() => setIsDraggingPlayhead(true)}
            onDragEnd={() => setIsDraggingPlayhead(false)}
          />

          {/* Snap lines */}
          {snapEnabled && snapLines.map((line, index) => (
            <div
              key={index}
              className="absolute top-0 w-px bg-primary/50 pointer-events-none"
              style={{
                left: line.time * zoom - scrollLeft,
                height: totalTracksHeight,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

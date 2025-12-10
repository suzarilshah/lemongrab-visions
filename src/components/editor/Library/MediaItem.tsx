/**
 * Media Item Component
 * Draggable video item in the media library
 */

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Clock, Film } from 'lucide-react';
import { MediaItem as MediaItemType } from '@/types/editor';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MediaItemProps {
  item: MediaItemType;
  onDragStart: (item: MediaItemType) => void;
  onDragEnd: () => void;
}

export default function MediaItem({ item, onDragStart, onDragEnd }: MediaItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent) => {
    // Set drag data
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';

    // Create drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'fixed pointer-events-none bg-primary/80 text-white px-3 py-2 rounded-lg text-sm';
    dragImage.textContent = item.prompt.slice(0, 30) + (item.prompt.length > 30 ? '...' : '');
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    // Clean up drag image after a short delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    onDragStart(item);
  }, [item, onDragStart]);

  const handleDragEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      className={cn(
        'relative rounded-lg overflow-hidden cursor-grab active:cursor-grabbing',
        'bg-card border border-border/50 hover:border-primary/50 transition-colors',
        'group'
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Thumbnail / Video preview */}
      <div className="aspect-video relative bg-black/50">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.prompt}
            className={cn(
              'w-full h-full object-cover',
              isPlaying && 'opacity-0'
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}

        {/* Video element (plays on hover) */}
        <video
          ref={videoRef}
          src={item.url}
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            !isPlaying && 'opacity-0'
          )}
          muted
          loop
          playsInline
          preload="metadata"
        />

        {/* Play indicator */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-black/30',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'pointer-events-none'
          )}
        >
          <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
            {isPlaying ? (
              <Pause className="h-6 w-6 text-white" />
            ) : (
              <Play className="h-6 w-6 text-white" />
            )}
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="bg-black/70 text-white text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {formatDuration(item.duration)}
          </Badge>
        </div>

        {/* Sora version badge */}
        <div className="absolute top-2 left-2">
          <Badge
            className={cn(
              'text-[10px]',
              item.soraVersion === 'sora-2'
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/20 backdrop-blur-sm text-white'
            )}
          >
            {item.soraVersion === 'sora-2' ? 'Sora 2' : 'Sora 1'}
          </Badge>
        </div>

        {/* Drag hint */}
        <div
          className={cn(
            'absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity',
            'text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded'
          )}
        >
          Drag to timeline
        </div>
      </div>

      {/* Info */}
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium line-clamp-2 leading-relaxed">
          {item.prompt}
        </p>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{item.width}x{item.height}</span>
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </motion.div>
  );
}

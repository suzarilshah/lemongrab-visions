/**
 * Media Item Component
 * Draggable video item in the media library
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Clock, Film, Loader2 } from 'lucide-react';
import { MediaItem as MediaItemType } from '@/types/editor';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getActiveProfile } from '@/lib/profiles';

interface MediaItemProps {
  item: MediaItemType;
  onDragStart: (item: MediaItemType) => void;
  onDragEnd: () => void;
}

export default function MediaItem({ item, onDragStart, onDragEnd }: MediaItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load video with authentication for Azure URLs
  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    const loadVideo = async () => {
      // If URL is already a blob URL or data URL, use it directly
      if (item.url.startsWith('blob:') || item.url.startsWith('data:')) {
        setBlobUrl(item.url);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(false);

        const profile = await getActiveProfile();
        const headers: HeadersInit = {};

        // Add API key if available and URL looks like an Azure URL
        if (profile?.apiKey && (item.url.includes('azure') || item.url.includes('openai'))) {
          headers['api-key'] = profile.apiKey;
        }

        const response = await fetch(item.url, { headers });

        if (!response.ok) {
          throw new Error(`Failed to load video: ${response.status}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (mounted) {
          setBlobUrl(objectUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load video preview:', err);
        if (mounted) {
          setLoadError(true);
          setIsLoading(false);
          // Fallback: try loading directly (might work for non-Azure URLs)
          setBlobUrl(item.url);
        }
      }
    };

    loadVideo();

    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [item.url]);

  const handleMouseEnter = () => {
    setIsHovering(true);
    // Don't auto-play if currently dragging
    if (videoRef.current && blobUrl && !isDragging) {
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

  // Stop video when dragging starts
  const stopVideoPlayback = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    // Stop video playback immediately when drag starts
    setIsDragging(true);
    stopVideoPlayback();

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
  }, [item, onDragStart, stopVideoPlayback]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
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
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.prompt}
            className={cn(
              'w-full h-full object-cover',
              isPlaying && 'opacity-0'
            )}
          />
        ) : null}

        {/* Video element - shows first frame as thumbnail when not playing */}
        {blobUrl && (
          <video
            ref={videoRef}
            src={blobUrl}
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              isLoading && 'opacity-0'
            )}
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedData={(e) => {
              // Seek to first frame to show thumbnail
              const video = e.currentTarget;
              if (video.currentTime === 0 && !isPlaying) {
                video.currentTime = 0.1;
              }
            }}
          />
        )}

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

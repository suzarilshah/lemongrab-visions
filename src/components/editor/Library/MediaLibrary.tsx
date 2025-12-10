/**
 * Media Library Component
 * Panel showing user's videos for drag-and-drop to timeline
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Film, RefreshCw, Filter, Grid, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaItem as MediaItemType } from '@/types/editor';
import { listVideosFromStorage, VideoMetadata } from '@/lib/videoStorage';
import MediaItem from './MediaItem';
import { cn } from '@/lib/utils';

interface MediaLibraryProps {
  onDragStart: (item: MediaItemType) => void;
  onDragEnd: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function MediaLibrary({
  onDragStart,
  onDragEnd,
  isCollapsed = false,
  onToggleCollapse,
}: MediaLibraryProps) {
  const [videos, setVideos] = useState<MediaItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVersion, setFilterVersion] = useState<'all' | 'sora-1' | 'sora-2'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load videos
  const loadVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const videoList = await listVideosFromStorage(100);
      const mediaItems: MediaItemType[] = videoList.map((video) => ({
        id: video.id,
        url: video.url,
        thumbnailUrl: undefined, // Could generate thumbnails later
        prompt: video.prompt,
        duration: parseFloat(video.duration) || 10,
        width: parseInt(video.width) || 1280,
        height: parseInt(video.height) || 720,
        soraVersion: video.soraVersion || 'sora-1',
        createdAt: video.timestamp,
      }));
      setVideos(mediaItems);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Filter videos
  const filteredVideos = videos.filter((video) => {
    // Search filter
    if (searchQuery && !video.prompt.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Version filter
    if (filterVersion !== 'all' && video.soraVersion !== filterVersion) {
      return false;
    }
    return true;
  });

  if (isCollapsed) {
    return (
      <div className="w-12 bg-card/50 border-r border-border/50 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <Film className="h-5 w-5" />
        </Button>
        <div className="flex-1" />
        <Badge variant="secondary" className="rotate-90 whitespace-nowrap">
          {videos.length} videos
        </Badge>
      </div>
    );
  }

  return (
    <div className="w-72 bg-card/50 border-r border-border/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Media Library</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={loadVideos}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onToggleCollapse}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background/50"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <Tabs value={filterVersion} onValueChange={(v) => setFilterVersion(v as any)}>
            <TabsList className="h-8 bg-background/50">
              <TabsTrigger value="all" className="text-xs px-2 h-6">All</TabsTrigger>
              <TabsTrigger value="sora-2" className="text-xs px-2 h-6">Sora 2</TabsTrigger>
              <TabsTrigger value="sora-1" className="text-xs px-2 h-6">Sora 1</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Loading videos...</p>
              </div>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Film className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                <div>
                  <p className="font-medium">No videos found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || filterVersion !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Generate some videos first'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-2 gap-2'
                  : 'space-y-2'
              )}
            >
              <AnimatePresence mode="popLayout">
                {filteredVideos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <MediaItem
                      item={video}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 bg-card/30">
        <p className="text-xs text-muted-foreground text-center">
          {filteredVideos.length} of {videos.length} videos
        </p>
      </div>
    </div>
  );
}

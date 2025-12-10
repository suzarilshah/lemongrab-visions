/**
 * Media Library Component
 * Panel showing user's videos for drag-and-drop to timeline
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Film, RefreshCw, Grid, List, X, Plus, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { MediaItem as MediaItemType } from '@/types/editor';
import { listVideosFromStorage, saveVideoMetadata } from '@/lib/videoStorage';
import { generateVideo } from '@/lib/videoGenerator';
import { getActiveProfile } from '@/lib/profiles';
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

  // Generation state
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generateDuration, setGenerateDuration] = useState('4');
  const [generateResolution, setGenerateResolution] = useState('1280x720');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateStatus, setGenerateStatus] = useState('');

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

  // Generate new video
  const handleGenerateVideo = useCallback(async () => {
    if (!generatePrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    const profile = await getActiveProfile();
    if (!profile) {
      toast.error('Please configure your Azure settings first');
      return;
    }

    setIsGenerating(true);
    setGenerateProgress(10);
    setGenerateStatus('Starting video generation...');

    const [width, height] = generateResolution.split('x');

    try {
      const result = await generateVideo({
        prompt: generatePrompt,
        duration: parseInt(generateDuration),
        width,
        height,
        variants: '1',
        endpoint: profile.endpoint,
        apiKey: profile.apiKey,
        deployment: profile.deployment,
        onProgress: (status) => {
          setGenerateStatus(status);
          // Parse progress from status if available
          if (status.includes('Generating')) {
            setGenerateProgress(50);
          } else if (status.includes('Processing')) {
            setGenerateProgress(70);
          } else if (status.includes('Downloading')) {
            setGenerateProgress(90);
          }
        },
      });

      // Save to storage
      const videoUrl = URL.createObjectURL(result.blob);
      await saveVideoMetadata({
        prompt: generatePrompt,
        url: result.downloadUrl || videoUrl,
        duration: generateDuration,
        height,
        width,
        variants: '1',
        soraVersion: profile.soraVersion,
        audio: false,
        jobId: result.videoId || `gen-${Date.now()}`,
      });

      setGenerateProgress(100);
      setGenerateStatus('Video generated successfully!');

      toast.success('Video generated!', {
        description: 'Drag it to the timeline to use it.',
      });

      // Reload videos
      await loadVideos();

      // Reset form after a delay
      setTimeout(() => {
        setShowGenerateDialog(false);
        setGeneratePrompt('');
        setGenerateProgress(0);
        setGenerateStatus('');
      }, 1500);
    } catch (error) {
      console.error('Failed to generate video:', error);
      toast.error('Failed to generate video', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setGenerateStatus('Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [generatePrompt, generateDuration, generateResolution, loadVideos]);

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

        {/* Generate Button */}
        <Button
          className="w-full btn-premium gap-2"
          onClick={() => setShowGenerateDialog(true)}
        >
          <Sparkles className="h-4 w-4" />
          Generate New Video
        </Button>

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

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Video with AI
            </DialogTitle>
            <DialogDescription>
              Create a new video using Sora AI. It will be added to your library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe the video you want to generate..."
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* Settings Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Duration */}
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={generateDuration}
                  onValueChange={setGenerateDuration}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 seconds</SelectItem>
                    <SelectItem value="8">8 seconds</SelectItem>
                    <SelectItem value="12">12 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution */}
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select
                  value={generateResolution}
                  onValueChange={setGenerateResolution}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1920x1080">1080p HD</SelectItem>
                    <SelectItem value="1280x720">720p</SelectItem>
                    <SelectItem value="854x480">480p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Progress */}
            {isGenerating && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {generateStatus || 'Generating...'}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(generateProgress)}%
                  </span>
                </div>
                <Progress value={generateProgress} className="h-2" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowGenerateDialog(false)}
              disabled={isGenerating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateVideo}
              disabled={isGenerating || !generatePrompt.trim()}
              className="flex-1 btn-premium"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

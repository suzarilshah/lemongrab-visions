/**
 * Video Editor Page
 * Professional timeline-based video editor like Adobe Premiere Pro
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Download,
  Undo,
  Redo,
  Scissors,
  Trash2,
  Copy,
  Film,
  Settings,
  Moon,
  Sun,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTheme } from '@/components/ThemeProvider';
import { getCurrentUser, User } from '@/lib/auth';
import logo from '@/assets/logo.svg';

// Editor components
import Timeline from '@/components/editor/Timeline/Timeline';
import MediaLibrary from '@/components/editor/Library/MediaLibrary';
import PreviewPlayer from '@/components/editor/Preview/PreviewPlayer';
import ExportDialog from '@/components/editor/ExportDialog';

// State management
import { useEditorState, createDefaultProject } from '@/lib/editor/timelineState';
import { MediaItem, Clip, EDITOR_CONSTANTS } from '@/types/editor';

export default function VideoEditor() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [isSaving, setIsSaving] = useState(false);
  const [draggedMedia, setDraggedMedia] = useState<MediaItem | null>(null);

  // Editor state
  const { state, actions, computed } = useEditorState();

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          navigate('/login');
          return;
        }
        setUser(currentUser);
      } catch {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  // Initialize project
  useEffect(() => {
    if (!state.project) {
      const project = createDefaultProject(projectName);
      actions.setProject(project);
    }
  }, [state.project, projectName, actions]);

  // Handle media drag start
  const handleMediaDragStart = useCallback((item: MediaItem) => {
    setDraggedMedia(item);
  }, []);

  // Handle media drag end
  const handleMediaDragEnd = useCallback(() => {
    setDraggedMedia(null);
  }, []);

  // Handle drop on timeline
  const handleDropClip = useCallback((trackId: string, time: number) => {
    if (!draggedMedia) return;

    const newClip: Omit<Clip, 'id' | 'trackId' | 'selected'> = {
      videoId: draggedMedia.id,
      sourceUrl: draggedMedia.url,
      thumbnailUrl: draggedMedia.thumbnailUrl,
      prompt: draggedMedia.prompt,
      startTime: Math.max(0, time),
      duration: draggedMedia.duration,
      inPoint: 0,
      outPoint: draggedMedia.duration,
      sourceDuration: draggedMedia.duration,
      audioEnabled: true,
      volume: 1,
      opacity: 1,
    };

    actions.addClip(trackId, newClip);
    actions.pushHistory();
    setDraggedMedia(null);

    toast.success('Clip added to timeline', {
      description: draggedMedia.prompt.slice(0, 40) + '...',
    });
  }, [draggedMedia, actions]);

  // Handle clip double click (show properties)
  const handleClipDoubleClick = useCallback((clipId: string) => {
    actions.selectClip(clipId);
    // Could open properties panel here
    toast.info('Clip selected', {
      description: 'Use the trim handles to adjust duration',
    });
  }, [actions]);

  // Save project
  const handleSave = useCallback(async () => {
    if (!state.project) return;
    setIsSaving(true);

    try {
      // TODO: Save to database
      await new Promise(r => setTimeout(r, 500)); // Simulated delay
      toast.success('Project saved');
    } catch (error) {
      toast.error('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  }, [state.project]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (computed.canRedo) actions.redo();
        } else {
          if (computed.canUndo) actions.undo();
        }
        return;
      }

      // Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Delete selected clips
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedClipIds.length > 0) {
          e.preventDefault();
          actions.removeClip(state.selectedClipIds[0]);
          actions.pushHistory();
        }
        return;
      }

      // Duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        if (state.selectedClipIds.length > 0) {
          e.preventDefault();
          actions.duplicateClip(state.selectedClipIds[0]);
          actions.pushHistory();
        }
        return;
      }

      // Split at playhead
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        if (state.selectedClipIds.length === 1) {
          actions.splitClip(state.selectedClipIds[0], state.currentTime);
          actions.pushHistory();
        }
        return;
      }

      // Deselect
      if (e.key === 'Escape') {
        actions.deselectAll();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, actions, computed, handleSave]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-mesh opacity-30" />
        <div className="absolute inset-0 bg-grid opacity-10" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left section */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <img src={logo} alt="Octo" className="h-7 w-7" />
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="h-8 w-48 bg-transparent border-transparent hover:border-border focus:border-primary"
              />
            </div>

            <Badge variant="outline" className="border-primary/30 bg-primary/5">
              <Film className="h-3 w-3 mr-1" />
              Video Editor
            </Badge>
          </div>

          {/* Center section - Edit tools */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={actions.undo}
                  disabled={!computed.canUndo}
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (⌘Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={actions.redo}
                  disabled={!computed.canRedo}
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-border mx-2" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={state.selectedClipIds.length === 0}
                  onClick={() => {
                    if (state.selectedClipIds.length === 1) {
                      actions.splitClip(state.selectedClipIds[0], state.currentTime);
                      actions.pushHistory();
                    }
                  }}
                >
                  <Scissors className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Split at Playhead (C)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={state.selectedClipIds.length === 0}
                  onClick={() => {
                    actions.duplicateClip(state.selectedClipIds[0]);
                    actions.pushHistory();
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate (⌘D)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:text-destructive"
                  disabled={state.selectedClipIds.length === 0}
                  onClick={() => {
                    actions.removeClip(state.selectedClipIds[0]);
                    actions.pushHistory();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete (Del)</TooltipContent>
            </Tooltip>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <div className="w-px h-4 bg-border" />

            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>

            <ExportDialog project={state.project} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Media Library */}
        <MediaLibrary
          onDragStart={handleMediaDragStart}
          onDragEnd={handleMediaDragEnd}
          isCollapsed={!state.showLibrary}
          onToggleCollapse={actions.toggleLibrary}
        />

        {/* Center area */}
        <div className="flex-1 flex flex-col min-w-0 p-4 gap-4">
          {/* Preview Player */}
          <div className="h-[45%] min-h-[250px]">
            <PreviewPlayer
              project={state.project}
              currentTime={state.currentTime}
              isPlaying={state.isPlaying}
              onTimeChange={actions.setCurrentTime}
              onPlayPause={actions.togglePlayback}
              onSetPlaying={actions.setPlaying}
            />
          </div>

          {/* Timeline */}
          <div className="flex-1 min-h-[200px]">
            <Timeline
              project={state.project}
              currentTime={state.currentTime}
              isPlaying={state.isPlaying}
              zoom={state.zoom}
              scrollLeft={state.scrollLeft}
              selectedClipIds={state.selectedClipIds}
              dragClipId={state.dragClipId}
              snapEnabled={state.snapEnabled}
              snapLines={state.snapLines}
              onSetCurrentTime={actions.setCurrentTime}
              onSetZoom={actions.setZoom}
              onSetScroll={actions.setScroll}
              onSelectClip={actions.selectClip}
              onDeselectAll={actions.deselectAll}
              onMoveClip={(clipId, startTime, trackId) => {
                actions.moveClip(clipId, startTime, trackId);
                actions.pushHistory();
              }}
              onTrimClip={(clipId, inPoint, outPoint, startTime, duration) => {
                actions.trimClip(clipId, { inPoint, outPoint, startTime, duration });
                actions.pushHistory();
              }}
              onStartDrag={actions.startDrag}
              onEndDrag={actions.endDrag}
              onToggleClipAudio={(clipId) => {
                const clip = state.project?.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
                if (clip) {
                  actions.updateClip(clipId, { audioEnabled: !clip.audioEnabled });
                }
              }}
              onToggleTrackMute={actions.toggleTrackMute}
              onToggleTrackLock={actions.toggleTrackLock}
              onUpdateTrack={actions.updateTrack}
              onAddTrack={() => {
                const trackNum = (state.project?.tracks.length || 0) + 1;
                actions.addTrack({
                  name: `Video ${trackNum}`,
                  type: 'video',
                  muted: false,
                  locked: false,
                  height: EDITOR_CONSTANTS.DEFAULT_TRACK_HEIGHT,
                  collapsed: false,
                });
              }}
              onRemoveTrack={actions.removeTrack}
              onDropClip={handleDropClip}
              onToggleSnap={actions.toggleSnap}
              onClipDoubleClick={handleClipDoubleClick}
            />
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      {draggedMedia && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
            <p className="text-sm font-medium">
              Drag to a track on the timeline
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

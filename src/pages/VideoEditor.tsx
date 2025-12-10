/**
 * Video Editor Page
 * Professional timeline-based video editor like Adobe Premiere Pro
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  PanelRightClose,
  PanelRightOpen,
  Keyboard,
  HelpCircle,
  FolderOpen,
  FilePlus,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/ThemeProvider';
import { getCurrentUser, User } from '@/lib/auth';
import logo from '@/assets/logo.svg';

// Editor components
import Timeline from '@/components/editor/Timeline/Timeline';
import MediaLibrary from '@/components/editor/Library/MediaLibrary';
import PreviewPlayer from '@/components/editor/Preview/PreviewPlayer';
import ExportDialog from '@/components/editor/ExportDialog';
import FillerGeneratorDialog from '@/components/editor/FillerGeneratorDialog';
import ClipPropertiesPanel from '@/components/editor/Properties/ClipPropertiesPanel';
import PlaybackSpeedControl from '@/components/editor/PlaybackSpeedControl';
import OnboardingOverlay from '@/components/editor/OnboardingOverlay';
import ProjectBrowser from '@/components/editor/ProjectBrowser';
import { Gap } from '@/lib/editor/fillerGenerator';

// State management
import { useEditorState, createDefaultProject } from '@/lib/editor/timelineState';
import { MediaItem, Clip, Track, EDITOR_CONSTANTS } from '@/types/editor';
import { saveEditorProject, loadEditorProject } from '@/lib/editorProjectStorage';

export default function VideoEditor() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [isSaving, setIsSaving] = useState(false);
  const [draggedMedia, setDraggedMedia] = useState<MediaItem | null>(null);
  const [showProperties, setShowProperties] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Editor state
  const { state, actions, computed } = useEditorState();

  // Get selected clip and its track
  const selectedClip = state.selectedClipIds.length === 1
    ? state.project?.tracks.flatMap(t => t.clips).find(c => c.id === state.selectedClipIds[0]) || null
    : null;

  const selectedClipTrack = selectedClip
    ? state.project?.tracks.find(t => t.clips.some(c => c.id === selectedClip.id)) || null
    : null;

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

  // Initialize or load project
  useEffect(() => {
    const initializeProject = async () => {
      // If we have a projectId in the URL, try to load it
      if (projectId) {
        try {
          const loadedProject = await loadEditorProject(projectId);
          if (loadedProject) {
            actions.setProject(loadedProject);
            setProjectName(loadedProject.name);
            return;
          }
        } catch (error) {
          console.error('Failed to load project:', error);
          toast.error('Failed to load project');
        }
      }

      // Create a new project if none exists
      if (!state.project) {
        const project = createDefaultProject(projectName);
        actions.setProject(project);
      }
    };

    initializeProject();
  }, [projectId]); // Only run on projectId change

  // Auto-save every 30 seconds when project has changes
  useEffect(() => {
    if (!state.project || state.historyIndex <= 0) return;

    const autoSaveTimer = setInterval(async () => {
      if (!state.project) return;
      try {
        const projectToSave = { ...state.project, name: projectName };
        await saveEditorProject(projectToSave);
        // Silent save - don't show toast for auto-saves
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveTimer);
  }, [state.project, state.historyIndex, projectName]);

  // Show onboarding for first-time users
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('editor-onboarding-complete');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('editor-onboarding-complete', 'true');
    setShowOnboarding(false);
  }, []);

  // Handle media drag start
  const handleMediaDragStart = useCallback((item: MediaItem) => {
    setDraggedMedia(item);
  }, []);

  // Handle media drag end
  const handleMediaDragEnd = useCallback(() => {
    setDraggedMedia(null);
  }, []);

  // Handle drop on timeline with auto-stitch (magnet) feature
  const handleDropClip = useCallback((trackId: string, time: number) => {
    if (!draggedMedia || !state.project) return;

    // Find the track to get existing clips
    const track = state.project.tracks.find(t => t.id === trackId);
    let finalStartTime = Math.max(0, time);

    // Auto-stitch: If snap is enabled, snap to the end of existing clips
    if (state.snapEnabled && track && track.clips.length > 0) {
      const snapThreshold = EDITOR_CONSTANTS.SNAP_THRESHOLD / state.zoom; // Convert pixels to seconds

      // Find all clip edges (start and end times)
      const clipEdges: number[] = [];
      for (const clip of track.clips) {
        clipEdges.push(clip.startTime); // Start of clip
        clipEdges.push(clip.startTime + clip.duration); // End of clip
      }

      // Find the nearest edge to snap to
      let nearestEdge = finalStartTime;
      let minDistance = Infinity;

      for (const edge of clipEdges) {
        const distance = Math.abs(edge - finalStartTime);
        if (distance < minDistance && distance <= snapThreshold) {
          minDistance = distance;
          nearestEdge = edge;
        }
      }

      // If no nearby edge, snap to the end of the last clip (auto-stitch)
      if (minDistance > snapThreshold && track.clips.length > 0) {
        const lastClip = track.clips.reduce((latest, clip) =>
          (clip.startTime + clip.duration) > (latest.startTime + latest.duration) ? clip : latest
        );
        const lastClipEnd = lastClip.startTime + lastClip.duration;

        // If dropping near or after the last clip, snap to its end
        if (finalStartTime >= lastClipEnd - snapThreshold) {
          nearestEdge = lastClipEnd;
        }
      }

      finalStartTime = nearestEdge;
    }

    const newClip: Omit<Clip, 'id' | 'trackId' | 'selected'> = {
      videoId: draggedMedia.id,
      sourceUrl: draggedMedia.url,
      thumbnailUrl: draggedMedia.thumbnailUrl,
      prompt: draggedMedia.prompt,
      startTime: finalStartTime,
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
  }, [draggedMedia, actions, state.project, state.snapEnabled, state.zoom]);

  // Handle clip double click (show properties)
  const handleClipDoubleClick = useCallback((clipId: string) => {
    actions.selectClip(clipId);
    // Could open properties panel here
    toast.info('Clip selected', {
      description: 'Use the trim handles to adjust duration',
    });
  }, [actions]);

  // Handle AI filler generation
  const handleFillerGenerated = useCallback((gap: Gap, result: { url: string; id: string; duration: number }) => {
    // Add the generated filler clip to the timeline at the gap position
    const newClip: Omit<Clip, 'id' | 'trackId' | 'selected'> = {
      videoId: result.id,
      sourceUrl: result.url,
      thumbnailUrl: undefined,
      prompt: 'AI Generated Filler',
      startTime: gap.startTime,
      duration: result.duration,
      inPoint: 0,
      outPoint: result.duration,
      sourceDuration: result.duration,
      audioEnabled: true,
      volume: 1,
      opacity: 1,
    };

    actions.addClip(gap.trackId, newClip);
    actions.pushHistory();

    toast.success('AI filler added to timeline', {
      description: `${result.duration}s clip added at ${Math.floor(gap.startTime / 60)}:${String(Math.floor(gap.startTime % 60)).padStart(2, '0')}`,
    });
  }, [actions]);

  // Save project
  const handleSave = useCallback(async () => {
    if (!state.project) return;
    setIsSaving(true);

    try {
      // Update project name before saving
      const projectToSave = {
        ...state.project,
        name: projectName,
      };
      await saveEditorProject(projectToSave);
      toast.success('Project saved', {
        description: 'Your changes have been saved to the cloud.',
      });
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [state.project, projectName]);

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
          const clipId = state.selectedClipIds[0];
          const clip = state.project?.tracks.flatMap(t => t.clips).find(c => c.id === clipId);

          if (clip) {
            const clipStart = clip.startTime;
            const clipEnd = clip.startTime + clip.duration;

            // Check if playhead is within clip bounds
            if (state.currentTime > clipStart && state.currentTime < clipEnd) {
              actions.splitClip(clipId, state.currentTime);
              actions.pushHistory();
              toast.success('Clip split', {
                description: `Split at ${Math.floor(state.currentTime / 60)}:${String(Math.floor(state.currentTime % 60)).padStart(2, '0')}`,
              });
            } else {
              toast.error('Cannot split here', {
                description: 'Move the playhead to a position within the selected clip',
              });
            }
          }
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

              {/* Project dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 gap-1 px-2">
                    <Input
                      value={projectName}
                      onChange={(e) => {
                        e.stopPropagation();
                        setProjectName(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-40 bg-transparent border-transparent hover:border-border focus:border-primary"
                    />
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      const project = createDefaultProject('Untitled Project');
                      actions.setProject(project);
                      setProjectName('Untitled Project');
                      navigate('/video-editor');
                      toast.success('New project created');
                    }}
                  >
                    <FilePlus className="h-4 w-4 mr-2" />
                    New Project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <ProjectBrowser
                    currentProjectId={projectId}
                    onProjectSelect={(id) => navigate(`/video-editor/${id}`)}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Browse Projects...
                      </DropdownMenuItem>
                    }
                  />
                </DropdownMenuContent>
              </DropdownMenu>
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
                      const clipId = state.selectedClipIds[0];
                      const clip = state.project?.tracks.flatMap(t => t.clips).find(c => c.id === clipId);

                      if (!clip) {
                        toast.error('No clip selected');
                        return;
                      }

                      const clipStart = clip.startTime;
                      const clipEnd = clip.startTime + clip.duration;

                      // Check if playhead is within clip bounds
                      if (state.currentTime <= clipStart || state.currentTime >= clipEnd) {
                        toast.error('Cannot split here', {
                          description: 'Move the playhead to a position within the selected clip',
                        });
                        return;
                      }

                      actions.splitClip(clipId, state.currentTime);
                      actions.pushHistory();
                      toast.success('Clip split', {
                        description: `Split at ${Math.floor(state.currentTime / 60)}:${String(Math.floor(state.currentTime % 60)).padStart(2, '0')}`,
                      });
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

            <div className="w-px h-4 bg-border mx-2" />

            <FillerGeneratorDialog
              project={state.project}
              onFillerGenerated={handleFillerGenerated}
              trigger={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-primary hover:text-primary"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI Filler
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate AI content to fill gaps</TooltipContent>
                </Tooltip>
              }
            />

            <div className="w-px h-4 bg-border mx-2" />

            <PlaybackSpeedControl
              speed={state.playbackRate}
              onSpeedChange={actions.setPlaybackRate}
            />
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowOnboarding(true)}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show Tutorial</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowProperties(!showProperties)}
                >
                  {showProperties ? (
                    <PanelRightClose className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showProperties ? 'Hide Properties' : 'Show Properties'}</TooltipContent>
            </Tooltip>

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

      {/* Main content - split into upper area (library + preview) and lower timeline */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Upper area: Media Library + Preview */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Media Library */}
          <MediaLibrary
            onDragStart={handleMediaDragStart}
            onDragEnd={handleMediaDragEnd}
            isCollapsed={!state.showLibrary}
            onToggleCollapse={actions.toggleLibrary}
          />

          {/* Preview Player area */}
          <div className="flex-1 flex flex-col min-w-0 p-4 overflow-hidden">
            <div className="flex-1 min-h-0">
              <PreviewPlayer
                project={state.project}
                currentTime={state.currentTime}
                isPlaying={state.isPlaying}
                playbackRate={state.playbackRate}
                onTimeChange={actions.setCurrentTime}
                onPlayPause={actions.togglePlayback}
                onSetPlaying={actions.setPlaying}
              />
            </div>
          </div>

          {/* Properties Panel */}
          <AnimatePresence>
            {showProperties && (
              <ClipPropertiesPanel
                clip={selectedClip}
                track={selectedClipTrack}
                onClose={() => setShowProperties(false)}
                onUpdateClip={(clipId, updates) => {
                  actions.updateClip(clipId, updates);
                  actions.pushHistory();
                }}
                onDuplicateClip={(clipId) => {
                  actions.duplicateClip(clipId);
                  actions.pushHistory();
                  toast.success('Clip duplicated');
                }}
                onDeleteClip={(clipId) => {
                  actions.removeClip(clipId);
                  actions.pushHistory();
                  toast.success('Clip deleted');
                }}
                onSplitClip={(clipId, time) => {
                  actions.splitClip(clipId, time);
                  actions.pushHistory();
                  toast.success('Clip split at playhead');
                }}
                currentTime={state.currentTime}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Timeline - FIXED at bottom, separate from preview area */}
        <div className="flex-shrink-0 h-[280px] border-t-2 border-border bg-card/80">
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

      {/* Onboarding overlay */}
      <OnboardingOverlay
        isVisible={showOnboarding}
        onDismiss={handleOnboardingComplete}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}

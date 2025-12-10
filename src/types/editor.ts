/**
 * Video Timeline Editor Types
 * Professional-grade types for Adobe Premiere Pro-like editor
 */

// ============================================
// Core Editor Types
// ============================================

export interface EditorProject {
  id: string;
  name: string;
  tracks: Track[];
  duration: number; // Total duration in seconds
  fps: number;
  resolution: Resolution;
  createdAt: string;
  updatedAt: string;
}

export interface Resolution {
  width: number;
  height: number;
}

// ============================================
// Track Types
// ============================================

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio';
  clips: Clip[];
  muted: boolean;
  locked: boolean;
  height: number; // Track height in pixels
  collapsed: boolean;
}

// ============================================
// Clip Types
// ============================================

export interface Clip {
  id: string;
  trackId: string;
  videoId: string; // Reference to video_metadata
  sourceUrl: string;
  thumbnailUrl?: string;
  prompt?: string; // Original generation prompt

  // Timeline position
  startTime: number; // Position on timeline (seconds)
  duration: number; // Visible duration on timeline (seconds)

  // Source trimming
  inPoint: number; // Source video start time (seconds)
  outPoint: number; // Source video end time (seconds)
  sourceDuration: number; // Original source duration

  // Audio
  audioEnabled: boolean;
  volume: number; // 0-1

  // Visual
  opacity: number; // 0-1

  // Transitions
  transitionIn?: Transition;
  transitionOut?: Transition;

  // State
  selected: boolean;
}

// ============================================
// Transition Types
// ============================================

export type TransitionType =
  | 'none'
  | 'fade'
  | 'dissolve'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'zoom'
  | 'ai-generated';

export interface Transition {
  id: string;
  type: TransitionType;
  duration: number; // Transition duration in seconds
  aiPrompt?: string; // For AI-generated transitions
  aiVideoUrl?: string; // Generated transition video
}

// ============================================
// Editor State Types
// ============================================

export interface EditorState {
  project: EditorProject | null;

  // Playback
  currentTime: number; // Current playhead position (seconds)
  isPlaying: boolean;
  playbackRate: number;

  // Selection
  selectedClipIds: string[];
  selectedTrackId: string | null;

  // View
  zoom: number; // Pixels per second (default: 50)
  scrollLeft: number; // Timeline scroll position
  scrollTop: number; // Tracks scroll position

  // Editing
  isDragging: boolean;
  dragClipId: string | null;
  dragStartX: number;
  dragStartTime: number;

  // Snapping
  snapEnabled: boolean;
  snapThreshold: number; // Pixels
  snapLines: SnapLine[];

  // History (undo/redo)
  historyIndex: number;
  history: EditorProject[];

  // UI
  showProperties: boolean;
  showLibrary: boolean;
}

export interface SnapLine {
  time: number;
  type: 'clip-start' | 'clip-end' | 'playhead' | 'marker';
  clipId?: string;
}

// ============================================
// Action Types
// ============================================

export type EditorAction =
  | { type: 'SET_PROJECT'; payload: EditorProject }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'TOGGLE_PLAYBACK' }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_PLAYBACK_RATE'; payload: number }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_SCROLL'; payload: { left?: number; top?: number } }
  | { type: 'SELECT_CLIP'; payload: { clipId: string; addToSelection?: boolean } }
  | { type: 'SELECT_TRACK'; payload: string | null }
  | { type: 'DESELECT_ALL' }
  | { type: 'ADD_CLIP'; payload: { trackId: string; clip: Omit<Clip, 'id' | 'trackId' | 'selected'> } }
  | { type: 'REMOVE_CLIP'; payload: string }
  | { type: 'UPDATE_CLIP'; payload: { clipId: string; updates: Partial<Clip> } }
  | { type: 'MOVE_CLIP'; payload: { clipId: string; startTime: number; trackId?: string } }
  | { type: 'TRIM_CLIP'; payload: { clipId: string; inPoint?: number; outPoint?: number; startTime?: number; duration?: number } }
  | { type: 'SPLIT_CLIP'; payload: { clipId: string; splitTime: number } }
  | { type: 'DUPLICATE_CLIP'; payload: string }
  | { type: 'ADD_TRACK'; payload: Omit<Track, 'id' | 'clips'> }
  | { type: 'REMOVE_TRACK'; payload: string }
  | { type: 'UPDATE_TRACK'; payload: { trackId: string; updates: Partial<Track> } }
  | { type: 'TOGGLE_TRACK_MUTE'; payload: string }
  | { type: 'TOGGLE_TRACK_LOCK'; payload: string }
  | { type: 'SET_TRANSITION'; payload: { clipId: string; position: 'in' | 'out'; transition: Transition | undefined } }
  | { type: 'START_DRAG'; payload: { clipId: string; startX: number; startTime: number } }
  | { type: 'END_DRAG' }
  | { type: 'SET_SNAP_LINES'; payload: SnapLine[] }
  | { type: 'TOGGLE_SNAP' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_HISTORY' }
  | { type: 'TOGGLE_PROPERTIES' }
  | { type: 'TOGGLE_LIBRARY' };

// ============================================
// Media Library Types
// ============================================

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  prompt: string;
  duration: number; // seconds
  width: number;
  height: number;
  soraVersion: string;
  createdAt: string;
}

// ============================================
// Export Types
// ============================================

export interface ExportSettings {
  format: 'mp4' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: Resolution;
  fps: number;
  includeAudio: boolean;
}

export interface ExportProgress {
  stage: 'preparing' | 'processing' | 'encoding' | 'finalizing' | 'complete' | 'error';
  progress: number; // 0-100
  currentClip?: number;
  totalClips?: number;
  message?: string;
}

// ============================================
// Keyboard Shortcuts
// ============================================

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  action: EditorAction['type'];
  description: string;
}

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { key: ' ', action: 'TOGGLE_PLAYBACK', description: 'Play/Pause' },
  { key: 'Delete', action: 'REMOVE_CLIP', description: 'Delete selected clips' },
  { key: 'Backspace', action: 'REMOVE_CLIP', description: 'Delete selected clips' },
  { key: 'z', modifiers: ['meta'], action: 'UNDO', description: 'Undo' },
  { key: 'z', modifiers: ['meta', 'shift'], action: 'REDO', description: 'Redo' },
  { key: 'd', modifiers: ['meta'], action: 'DUPLICATE_CLIP', description: 'Duplicate clip' },
];

// ============================================
// Constants
// ============================================

export const EDITOR_CONSTANTS = {
  MIN_ZOOM: 10, // 10 pixels per second
  MAX_ZOOM: 500, // 500 pixels per second
  DEFAULT_ZOOM: 50,
  DEFAULT_TRACK_HEIGHT: 80,
  MIN_CLIP_DURATION: 0.1, // 100ms minimum
  SNAP_THRESHOLD: 10, // pixels
  DEFAULT_FPS: 30,
  DEFAULT_RESOLUTION: { width: 1920, height: 1080 },
  TIMELINE_PADDING: 50, // Extra space at end of timeline
};

/**
 * Timeline State Management
 * useReducer-based state for the video editor
 */

import { useReducer, useCallback, useMemo } from 'react';
import {
  EditorState,
  EditorAction,
  EditorProject,
  Track,
  Clip,
  EDITOR_CONSTANTS,
} from '@/types/editor';

// ============================================
// Initial State
// ============================================

export const initialEditorState: EditorState = {
  project: null,

  // Playback
  currentTime: 0,
  isPlaying: false,
  playbackRate: 1,

  // Selection
  selectedClipIds: [],
  selectedTrackId: null,

  // View
  zoom: EDITOR_CONSTANTS.DEFAULT_ZOOM,
  scrollLeft: 0,
  scrollTop: 0,

  // Editing
  isDragging: false,
  dragClipId: null,
  dragStartX: 0,
  dragStartTime: 0,

  // Snapping
  snapEnabled: true,
  snapThreshold: EDITOR_CONSTANTS.SNAP_THRESHOLD,
  snapLines: [],

  // History
  historyIndex: -1,
  history: [],

  // UI
  showProperties: true,
  showLibrary: true,
};

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateProjectDuration(tracks: Track[]): number {
  let maxDuration = 0;
  for (const track of tracks) {
    for (const clip of track.clips) {
      const clipEnd = clip.startTime + clip.duration;
      if (clipEnd > maxDuration) {
        maxDuration = clipEnd;
      }
    }
  }
  return maxDuration + EDITOR_CONSTANTS.TIMELINE_PADDING / EDITOR_CONSTANTS.DEFAULT_ZOOM;
}

function findClipById(tracks: Track[], clipId: string): { clip: Clip; trackIndex: number; clipIndex: number } | null {
  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
    const track = tracks[trackIndex];
    for (let clipIndex = 0; clipIndex < track.clips.length; clipIndex++) {
      if (track.clips[clipIndex].id === clipId) {
        return { clip: track.clips[clipIndex], trackIndex, clipIndex };
      }
    }
  }
  return null;
}

function cloneProject(project: EditorProject): EditorProject {
  return JSON.parse(JSON.stringify(project));
}

// ============================================
// Reducer
// ============================================

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_PROJECT':
      return {
        ...state,
        project: action.payload,
        historyIndex: 0,
        history: [cloneProject(action.payload)],
        currentTime: 0,
        selectedClipIds: [],
        selectedTrackId: null,
      };

    case 'SET_CURRENT_TIME':
      return {
        ...state,
        currentTime: Math.max(0, action.payload),
      };

    case 'TOGGLE_PLAYBACK':
      return {
        ...state,
        isPlaying: !state.isPlaying,
      };

    case 'SET_PLAYING':
      return {
        ...state,
        isPlaying: action.payload,
      };

    case 'SET_PLAYBACK_RATE':
      return {
        ...state,
        playbackRate: action.payload,
      };

    case 'SET_ZOOM':
      return {
        ...state,
        zoom: Math.max(
          EDITOR_CONSTANTS.MIN_ZOOM,
          Math.min(EDITOR_CONSTANTS.MAX_ZOOM, action.payload)
        ),
      };

    case 'SET_SCROLL':
      return {
        ...state,
        scrollLeft: action.payload.left ?? state.scrollLeft,
        scrollTop: action.payload.top ?? state.scrollTop,
      };

    case 'SELECT_CLIP':
      if (action.payload.addToSelection) {
        const isSelected = state.selectedClipIds.includes(action.payload.clipId);
        return {
          ...state,
          selectedClipIds: isSelected
            ? state.selectedClipIds.filter(id => id !== action.payload.clipId)
            : [...state.selectedClipIds, action.payload.clipId],
        };
      }
      return {
        ...state,
        selectedClipIds: [action.payload.clipId],
      };

    case 'SELECT_TRACK':
      return {
        ...state,
        selectedTrackId: action.payload,
      };

    case 'DESELECT_ALL':
      return {
        ...state,
        selectedClipIds: [],
        selectedTrackId: null,
      };

    case 'ADD_CLIP': {
      if (!state.project) return state;

      const newClip: Clip = {
        ...action.payload.clip,
        id: generateId(),
        trackId: action.payload.trackId,
        selected: false,
      };

      const newTracks = state.project.tracks.map(track => {
        if (track.id === action.payload.trackId) {
          return {
            ...track,
            clips: [...track.clips, newClip].sort((a, b) => a.startTime - b.startTime),
          };
        }
        return track;
      });

      const newProject = {
        ...state.project,
        tracks: newTracks,
        duration: calculateProjectDuration(newTracks),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        project: newProject,
      };
    }

    case 'REMOVE_CLIP': {
      if (!state.project) return state;

      const clipIdsToRemove = state.selectedClipIds.length > 0
        ? state.selectedClipIds
        : [action.payload];

      const newTracks = state.project.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(clip => !clipIdsToRemove.includes(clip.id)),
      }));

      const newProject = {
        ...state.project,
        tracks: newTracks,
        duration: calculateProjectDuration(newTracks),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        project: newProject,
        selectedClipIds: [],
      };
    }

    case 'UPDATE_CLIP': {
      if (!state.project) return state;

      const newTracks = state.project.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === action.payload.clipId
            ? { ...clip, ...action.payload.updates }
            : clip
        ),
      }));

      const newProject = {
        ...state.project,
        tracks: newTracks,
        duration: calculateProjectDuration(newTracks),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        project: newProject,
      };
    }

    case 'MOVE_CLIP': {
      if (!state.project) return state;

      const found = findClipById(state.project.tracks, action.payload.clipId);
      if (!found) return state;

      let newTracks = [...state.project.tracks];
      const targetTrackId = action.payload.trackId || found.clip.trackId;

      // Remove from current track
      newTracks = newTracks.map(track => ({
        ...track,
        clips: track.clips.filter(clip => clip.id !== action.payload.clipId),
      }));

      // Add to target track
      const movedClip = {
        ...found.clip,
        trackId: targetTrackId,
        startTime: Math.max(0, action.payload.startTime),
      };

      newTracks = newTracks.map(track => {
        if (track.id === targetTrackId) {
          return {
            ...track,
            clips: [...track.clips, movedClip].sort((a, b) => a.startTime - b.startTime),
          };
        }
        return track;
      });

      const newProject = {
        ...state.project,
        tracks: newTracks,
        duration: calculateProjectDuration(newTracks),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        project: newProject,
      };
    }

    case 'TRIM_CLIP': {
      if (!state.project) return state;

      const newTracks = state.project.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === action.payload.clipId) {
            const updates: Partial<Clip> = {};

            if (action.payload.inPoint !== undefined) {
              updates.inPoint = Math.max(0, action.payload.inPoint);
            }
            if (action.payload.outPoint !== undefined) {
              updates.outPoint = Math.min(clip.sourceDuration, action.payload.outPoint);
            }
            if (action.payload.startTime !== undefined) {
              updates.startTime = Math.max(0, action.payload.startTime);
            }
            if (action.payload.duration !== undefined) {
              updates.duration = Math.max(EDITOR_CONSTANTS.MIN_CLIP_DURATION, action.payload.duration);
            }

            return { ...clip, ...updates };
          }
          return clip;
        }),
      }));

      const newProject = {
        ...state.project,
        tracks: newTracks,
        duration: calculateProjectDuration(newTracks),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        project: newProject,
      };
    }

    case 'SPLIT_CLIP': {
      if (!state.project) return state;

      const found = findClipById(state.project.tracks, action.payload.clipId);
      if (!found) return state;

      const { clip } = found;
      const splitTime = action.payload.splitTime;

      // Validate split time is within clip bounds
      if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
        return state;
      }

      const timeIntoClip = splitTime - clip.startTime;
      const sourceTimeAtSplit = clip.inPoint + timeIntoClip;

      // First clip (left part)
      const firstClip: Clip = {
        ...clip,
        duration: timeIntoClip,
        outPoint: sourceTimeAtSplit,
      };

      // Second clip (right part)
      const secondClip: Clip = {
        ...clip,
        id: generateId(),
        startTime: splitTime,
        duration: clip.duration - timeIntoClip,
        inPoint: sourceTimeAtSplit,
      };

      const newTracks = state.project.tracks.map(track => {
        if (track.id === clip.trackId) {
          const newClips = track.clips
            .filter(c => c.id !== clip.id)
            .concat([firstClip, secondClip])
            .sort((a, b) => a.startTime - b.startTime);
          return { ...track, clips: newClips };
        }
        return track;
      });

      const newProject = {
        ...state.project,
        tracks: newTracks,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        project: newProject,
        selectedClipIds: [secondClip.id],
      };
    }

    case 'DUPLICATE_CLIP': {
      if (!state.project) return state;

      const clipIdToDuplicate = state.selectedClipIds[0] || action.payload;
      const found = findClipById(state.project.tracks, clipIdToDuplicate);
      if (!found) return state;

      const newClip: Clip = {
        ...found.clip,
        id: generateId(),
        startTime: found.clip.startTime + found.clip.duration + 0.5, // Place after original
        selected: false,
      };

      const newTracks = state.project.tracks.map(track => {
        if (track.id === found.clip.trackId) {
          return {
            ...track,
            clips: [...track.clips, newClip].sort((a, b) => a.startTime - b.startTime),
          };
        }
        return track;
      });

      const newProject = {
        ...state.project,
        tracks: newTracks,
        duration: calculateProjectDuration(newTracks),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        project: newProject,
        selectedClipIds: [newClip.id],
      };
    }

    case 'ADD_TRACK': {
      if (!state.project) return state;

      const newTrack: Track = {
        ...action.payload,
        id: generateId(),
        clips: [],
      };

      const newProject = {
        ...state.project,
        tracks: [...state.project.tracks, newTrack],
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        project: newProject,
      };
    }

    case 'REMOVE_TRACK': {
      if (!state.project || state.project.tracks.length <= 1) return state;

      const newProject = {
        ...state.project,
        tracks: state.project.tracks.filter(track => track.id !== action.payload),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        project: newProject,
        selectedTrackId: null,
      };
    }

    case 'UPDATE_TRACK': {
      if (!state.project) return state;

      const newTracks = state.project.tracks.map(track =>
        track.id === action.payload.trackId
          ? { ...track, ...action.payload.updates }
          : track
      );

      const newProject = {
        ...state.project,
        tracks: newTracks,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        project: newProject,
      };
    }

    case 'TOGGLE_TRACK_MUTE': {
      if (!state.project) return state;

      const newTracks = state.project.tracks.map(track =>
        track.id === action.payload ? { ...track, muted: !track.muted } : track
      );

      return {
        ...state,
        project: { ...state.project, tracks: newTracks },
      };
    }

    case 'TOGGLE_TRACK_LOCK': {
      if (!state.project) return state;

      const newTracks = state.project.tracks.map(track =>
        track.id === action.payload ? { ...track, locked: !track.locked } : track
      );

      return {
        ...state,
        project: { ...state.project, tracks: newTracks },
      };
    }

    case 'SET_TRANSITION': {
      if (!state.project) return state;

      const newTracks = state.project.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === action.payload.clipId) {
            if (action.payload.position === 'in') {
              return { ...clip, transitionIn: action.payload.transition };
            } else {
              return { ...clip, transitionOut: action.payload.transition };
            }
          }
          return clip;
        }),
      }));

      return {
        ...state,
        project: { ...state.project, tracks: newTracks },
      };
    }

    case 'START_DRAG':
      return {
        ...state,
        isDragging: true,
        dragClipId: action.payload.clipId,
        dragStartX: action.payload.startX,
        dragStartTime: action.payload.startTime,
      };

    case 'END_DRAG':
      return {
        ...state,
        isDragging: false,
        dragClipId: null,
        dragStartX: 0,
        dragStartTime: 0,
        snapLines: [],
      };

    case 'SET_SNAP_LINES':
      return {
        ...state,
        snapLines: action.payload,
      };

    case 'TOGGLE_SNAP':
      return {
        ...state,
        snapEnabled: !state.snapEnabled,
      };

    case 'PUSH_HISTORY': {
      if (!state.project) return state;

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(cloneProject(state.project));

      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;

      const previousProject = state.history[state.historyIndex - 1];
      return {
        ...state,
        project: cloneProject(previousProject),
        historyIndex: state.historyIndex - 1,
        selectedClipIds: [],
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;

      const nextProject = state.history[state.historyIndex + 1];
      return {
        ...state,
        project: cloneProject(nextProject),
        historyIndex: state.historyIndex + 1,
        selectedClipIds: [],
      };
    }

    case 'TOGGLE_PROPERTIES':
      return {
        ...state,
        showProperties: !state.showProperties,
      };

    case 'TOGGLE_LIBRARY':
      return {
        ...state,
        showLibrary: !state.showLibrary,
      };

    default:
      return state;
  }
}

// ============================================
// Custom Hook
// ============================================

export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);

  // Memoized dispatch functions
  const actions = useMemo(() => ({
    setProject: (project: EditorProject) => dispatch({ type: 'SET_PROJECT', payload: project }),
    setCurrentTime: (time: number) => dispatch({ type: 'SET_CURRENT_TIME', payload: time }),
    togglePlayback: () => dispatch({ type: 'TOGGLE_PLAYBACK' }),
    setPlaying: (playing: boolean) => dispatch({ type: 'SET_PLAYING', payload: playing }),
    setPlaybackRate: (rate: number) => dispatch({ type: 'SET_PLAYBACK_RATE', payload: rate }),
    setZoom: (zoom: number) => dispatch({ type: 'SET_ZOOM', payload: zoom }),
    setScroll: (scroll: { left?: number; top?: number }) => dispatch({ type: 'SET_SCROLL', payload: scroll }),
    selectClip: (clipId: string, addToSelection?: boolean) =>
      dispatch({ type: 'SELECT_CLIP', payload: { clipId, addToSelection } }),
    selectTrack: (trackId: string | null) => dispatch({ type: 'SELECT_TRACK', payload: trackId }),
    deselectAll: () => dispatch({ type: 'DESELECT_ALL' }),
    addClip: (trackId: string, clip: Omit<Clip, 'id' | 'trackId' | 'selected'>) =>
      dispatch({ type: 'ADD_CLIP', payload: { trackId, clip } }),
    removeClip: (clipId: string) => dispatch({ type: 'REMOVE_CLIP', payload: clipId }),
    updateClip: (clipId: string, updates: Partial<Clip>) =>
      dispatch({ type: 'UPDATE_CLIP', payload: { clipId, updates } }),
    moveClip: (clipId: string, startTime: number, trackId?: string) =>
      dispatch({ type: 'MOVE_CLIP', payload: { clipId, startTime, trackId } }),
    trimClip: (clipId: string, trim: { inPoint?: number; outPoint?: number; startTime?: number; duration?: number }) =>
      dispatch({ type: 'TRIM_CLIP', payload: { clipId, ...trim } }),
    splitClip: (clipId: string, splitTime: number) =>
      dispatch({ type: 'SPLIT_CLIP', payload: { clipId, splitTime } }),
    duplicateClip: (clipId: string) => dispatch({ type: 'DUPLICATE_CLIP', payload: clipId }),
    addTrack: (track: Omit<Track, 'id' | 'clips'>) => dispatch({ type: 'ADD_TRACK', payload: track }),
    removeTrack: (trackId: string) => dispatch({ type: 'REMOVE_TRACK', payload: trackId }),
    updateTrack: (trackId: string, updates: Partial<Track>) =>
      dispatch({ type: 'UPDATE_TRACK', payload: { trackId, updates } }),
    toggleTrackMute: (trackId: string) => dispatch({ type: 'TOGGLE_TRACK_MUTE', payload: trackId }),
    toggleTrackLock: (trackId: string) => dispatch({ type: 'TOGGLE_TRACK_LOCK', payload: trackId }),
    startDrag: (clipId: string, startX: number, startTime: number) =>
      dispatch({ type: 'START_DRAG', payload: { clipId, startX, startTime } }),
    endDrag: () => dispatch({ type: 'END_DRAG' }),
    setSnapLines: (lines: typeof state.snapLines) => dispatch({ type: 'SET_SNAP_LINES', payload: lines }),
    toggleSnap: () => dispatch({ type: 'TOGGLE_SNAP' }),
    pushHistory: () => dispatch({ type: 'PUSH_HISTORY' }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    toggleProperties: () => dispatch({ type: 'TOGGLE_PROPERTIES' }),
    toggleLibrary: () => dispatch({ type: 'TOGGLE_LIBRARY' }),
  }), []);

  // Computed values
  const computed = useMemo(() => ({
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    selectedClips: state.project
      ? state.project.tracks.flatMap(t => t.clips).filter(c => state.selectedClipIds.includes(c.id))
      : [],
    projectDuration: state.project?.duration || 0,
  }), [state.historyIndex, state.history.length, state.selectedClipIds, state.project]);

  return { state, actions, computed };
}

// ============================================
// Create Default Project
// ============================================

export function createDefaultProject(name: string = 'Untitled Project'): EditorProject {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    tracks: [
      {
        id: generateId(),
        name: 'Video 1',
        type: 'video',
        clips: [],
        muted: false,
        locked: false,
        height: EDITOR_CONSTANTS.DEFAULT_TRACK_HEIGHT,
        collapsed: false,
      },
      {
        id: generateId(),
        name: 'Video 2',
        type: 'video',
        clips: [],
        muted: false,
        locked: false,
        height: EDITOR_CONSTANTS.DEFAULT_TRACK_HEIGHT,
        collapsed: false,
      },
      {
        id: generateId(),
        name: 'Video 3',
        type: 'video',
        clips: [],
        muted: false,
        locked: false,
        height: EDITOR_CONSTANTS.DEFAULT_TRACK_HEIGHT,
        collapsed: false,
      },
    ],
    duration: 60, // 60 seconds default
    fps: EDITOR_CONSTANTS.DEFAULT_FPS,
    resolution: EDITOR_CONSTANTS.DEFAULT_RESOLUTION,
    createdAt: now,
    updatedAt: now,
  };
}

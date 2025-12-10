/**
 * Transition Effects Library
 * Defines available transitions and their configurations
 */

import { TransitionType, Transition } from '@/types/editor';

// ============================================
// Transition Definitions
// ============================================

export interface TransitionDefinition {
  type: TransitionType;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  defaultDuration: number; // seconds
  previewColor: string; // Tailwind color class
}

export const TRANSITION_DEFINITIONS: TransitionDefinition[] = [
  {
    type: 'none',
    name: 'Cut',
    description: 'Direct cut between clips',
    icon: 'Scissors',
    defaultDuration: 0,
    previewColor: 'bg-gray-500',
  },
  {
    type: 'fade',
    name: 'Fade',
    description: 'Fade to/from black',
    icon: 'Sun',
    defaultDuration: 0.5,
    previewColor: 'bg-amber-500',
  },
  {
    type: 'dissolve',
    name: 'Dissolve',
    description: 'Cross dissolve between clips',
    icon: 'Layers',
    defaultDuration: 1,
    previewColor: 'bg-purple-500',
  },
  {
    type: 'wipe-left',
    name: 'Wipe Left',
    description: 'Wipe from right to left',
    icon: 'ArrowLeft',
    defaultDuration: 0.5,
    previewColor: 'bg-blue-500',
  },
  {
    type: 'wipe-right',
    name: 'Wipe Right',
    description: 'Wipe from left to right',
    icon: 'ArrowRight',
    defaultDuration: 0.5,
    previewColor: 'bg-blue-500',
  },
  {
    type: 'wipe-up',
    name: 'Wipe Up',
    description: 'Wipe from bottom to top',
    icon: 'ArrowUp',
    defaultDuration: 0.5,
    previewColor: 'bg-cyan-500',
  },
  {
    type: 'wipe-down',
    name: 'Wipe Down',
    description: 'Wipe from top to bottom',
    icon: 'ArrowDown',
    defaultDuration: 0.5,
    previewColor: 'bg-cyan-500',
  },
  {
    type: 'zoom',
    name: 'Zoom',
    description: 'Zoom transition',
    icon: 'ZoomIn',
    defaultDuration: 0.5,
    previewColor: 'bg-green-500',
  },
  {
    type: 'ai-generated',
    name: 'AI Generated',
    description: 'AI creates custom transition',
    icon: 'Sparkles',
    defaultDuration: 2,
    previewColor: 'bg-gradient-to-r from-primary to-pink-500',
  },
];

// ============================================
// Transition Helper Functions
// ============================================

export function getTransitionDefinition(type: TransitionType): TransitionDefinition {
  return TRANSITION_DEFINITIONS.find(t => t.type === type) || TRANSITION_DEFINITIONS[0];
}

export function createTransition(
  type: TransitionType,
  duration?: number,
  aiPrompt?: string
): Transition {
  const definition = getTransitionDefinition(type);
  return {
    id: `transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    duration: duration ?? definition.defaultDuration,
    aiPrompt: type === 'ai-generated' ? aiPrompt : undefined,
  };
}

// ============================================
// CSS Keyframe Animations for Preview
// ============================================

export const transitionKeyframes = {
  fade: `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,
  dissolve: `
    @keyframes dissolve {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 0; }
    }
  `,
  wipeLeft: `
    @keyframes wipe-left {
      from { clip-path: inset(0 0 0 0); }
      to { clip-path: inset(0 100% 0 0); }
    }
  `,
  wipeRight: `
    @keyframes wipe-right {
      from { clip-path: inset(0 0 0 0); }
      to { clip-path: inset(0 0 0 100%); }
    }
  `,
  wipeUp: `
    @keyframes wipe-up {
      from { clip-path: inset(0 0 0 0); }
      to { clip-path: inset(100% 0 0 0); }
    }
  `,
  wipeDown: `
    @keyframes wipe-down {
      from { clip-path: inset(0 0 0 0); }
      to { clip-path: inset(0 0 100% 0); }
    }
  `,
  zoom: `
    @keyframes zoom-in {
      from { transform: scale(1); }
      to { transform: scale(1.5); opacity: 0; }
    }
  `,
};

// ============================================
// FFmpeg Filter Strings
// ============================================

export function getFFmpegTransitionFilter(
  transition: Transition,
  clip1Duration: number,
  clip2Start: number
): string {
  const offset = clip1Duration - transition.duration;

  switch (transition.type) {
    case 'fade':
      return `xfade=transition=fade:duration=${transition.duration}:offset=${offset}`;
    case 'dissolve':
      return `xfade=transition=dissolve:duration=${transition.duration}:offset=${offset}`;
    case 'wipe-left':
      return `xfade=transition=wipeleft:duration=${transition.duration}:offset=${offset}`;
    case 'wipe-right':
      return `xfade=transition=wiperight:duration=${transition.duration}:offset=${offset}`;
    case 'wipe-up':
      return `xfade=transition=wipeup:duration=${transition.duration}:offset=${offset}`;
    case 'wipe-down':
      return `xfade=transition=wipedown:duration=${transition.duration}:offset=${offset}`;
    case 'zoom':
      return `xfade=transition=zoomin:duration=${transition.duration}:offset=${offset}`;
    default:
      return ''; // No transition (cut)
  }
}

// ============================================
// Transition Preview Component Data
// ============================================

export function getTransitionPreviewStyle(
  type: TransitionType,
  progress: number // 0-1
): React.CSSProperties {
  switch (type) {
    case 'fade':
      return {
        opacity: 1 - progress,
      };
    case 'dissolve':
      return {
        opacity: 1 - progress,
        filter: `blur(${progress * 5}px)`,
      };
    case 'wipe-left':
      return {
        clipPath: `inset(0 ${progress * 100}% 0 0)`,
      };
    case 'wipe-right':
      return {
        clipPath: `inset(0 0 0 ${progress * 100}%)`,
      };
    case 'wipe-up':
      return {
        clipPath: `inset(${progress * 100}% 0 0 0)`,
      };
    case 'wipe-down':
      return {
        clipPath: `inset(0 0 ${progress * 100}% 0)`,
      };
    case 'zoom':
      return {
        transform: `scale(${1 + progress * 0.5})`,
        opacity: 1 - progress,
      };
    default:
      return {};
  }
}

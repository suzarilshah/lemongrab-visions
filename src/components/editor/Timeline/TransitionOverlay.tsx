/**
 * Transition Overlay Component
 * Shows transition zones between clips and handles transition selection
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
  Sun,
  Layers,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  Sparkles,
  Plus,
  X,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Transition, TransitionType, Clip } from '@/types/editor';
import {
  TRANSITION_DEFINITIONS,
  getTransitionDefinition,
  createTransition,
} from '@/lib/editor/transitions';

interface TransitionOverlayProps {
  clipA: Clip; // Outgoing clip
  clipB: Clip; // Incoming clip
  zoom: number;
  trackHeight: number;
  transition?: Transition;
  onSetTransition: (transition: Transition | undefined) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Scissors,
  Sun,
  Layers,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  Sparkles,
};

export default function TransitionOverlay({
  clipA,
  clipB,
  zoom,
  trackHeight,
  transition,
  onSetTransition,
}: TransitionOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<TransitionType>(
    transition?.type || 'none'
  );
  const [duration, setDuration] = useState(transition?.duration || 0.5);

  // Calculate position and size
  const clipAEnd = clipA.startTime + clipA.duration;
  const gapDuration = clipB.startTime - clipAEnd;
  const hasGap = gapDuration > 0.1; // More than 100ms gap

  // If clips overlap or touch, show transition zone at the junction
  const transitionStart = Math.min(clipAEnd, clipB.startTime);
  const transitionWidth = transition ? transition.duration * zoom : 40;
  const left = transitionStart * zoom - transitionWidth / 2;

  const handleApplyTransition = useCallback(() => {
    if (selectedType === 'none') {
      onSetTransition(undefined);
    } else {
      onSetTransition(createTransition(selectedType, duration));
    }
    setIsOpen(false);
  }, [selectedType, duration, onSetTransition]);

  const handleRemoveTransition = useCallback(() => {
    onSetTransition(undefined);
    setSelectedType('none');
    setIsOpen(false);
  }, [onSetTransition]);

  const definition = transition
    ? getTransitionDefinition(transition.type)
    : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <motion.div
          className={cn(
            'absolute top-1 cursor-pointer group',
            'flex items-center justify-center',
            transition
              ? 'bg-orange-500/30 border border-orange-500/50 rounded'
              : 'bg-transparent hover:bg-muted/30 rounded',
            hasGap && !transition && 'border border-dashed border-muted-foreground/30'
          )}
          style={{
            left,
            width: transition ? transitionWidth : 40,
            height: trackHeight - 8,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {transition ? (
            <div className="flex flex-col items-center justify-center">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  definition?.previewColor || 'bg-orange-500'
                )}
              >
                {definition &&
                  iconMap[definition.icon] &&
                  (() => {
                    const Icon = iconMap[definition.icon];
                    return <Icon className="h-3 w-3 text-white" />;
                  })()}
              </div>
              {transitionWidth > 50 && (
                <span className="text-[10px] text-orange-300 mt-1">
                  {transition.duration}s
                </span>
              )}
            </div>
          ) : (
            <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </motion.div>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="center">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Transition</h4>
            {transition && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveTransition}
                className="h-7 px-2 text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Remove
              </Button>
            )}
          </div>

          {/* Transition Types Grid */}
          <div className="grid grid-cols-3 gap-2">
            {TRANSITION_DEFINITIONS.filter(t => t.type !== 'ai-generated').map((def) => {
              const Icon = iconMap[def.icon];
              const isSelected = selectedType === def.type;
              return (
                <button
                  key={def.type}
                  onClick={() => setSelectedType(def.type)}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-lg border transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center mb-1',
                      isSelected ? def.previewColor : 'bg-muted'
                    )}
                  >
                    {Icon && (
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          isSelected ? 'text-white' : 'text-muted-foreground'
                        )}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{def.name}</span>
                </button>
              );
            })}
          </div>

          {/* AI Generated Option */}
          <button
            onClick={() => setSelectedType('ai-generated')}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
              selectedType === 'ai-generated'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                'bg-gradient-to-r from-primary to-pink-500'
              )}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">AI Generated</p>
              <p className="text-xs text-muted-foreground">
                Generate custom transition with AI
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Pro
            </Badge>
          </button>

          {/* Duration Slider */}
          {selectedType !== 'none' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Duration</label>
                <span className="text-sm text-muted-foreground">
                  {duration.toFixed(1)}s
                </span>
              </div>
              <Slider
                value={[duration]}
                min={0.1}
                max={3}
                step={0.1}
                onValueChange={([value]) => setDuration(value)}
              />
            </div>
          )}

          {/* Preview */}
          {selectedType !== 'none' && (
            <div className="relative h-16 rounded-lg overflow-hidden bg-black/50">
              <div className="absolute inset-0 flex">
                <div className="w-1/2 bg-blue-500/30 flex items-center justify-center">
                  <span className="text-xs text-white/70">Clip A</span>
                </div>
                <div className="w-1/2 bg-green-500/30 flex items-center justify-center">
                  <span className="text-xs text-white/70">Clip B</span>
                </div>
              </div>
              <motion.div
                className="absolute inset-y-0 left-1/2 -translate-x-1/2 bg-orange-500/50 flex items-center justify-center"
                style={{ width: `${(duration / 3) * 50}%` }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <span className="text-[10px] text-white">{selectedType}</span>
              </motion.div>
            </div>
          )}

          {/* Apply Button */}
          <Button
            onClick={handleApplyTransition}
            className="w-full"
            disabled={selectedType === transition?.type && duration === transition?.duration}
          >
            {transition ? 'Update Transition' : 'Apply Transition'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

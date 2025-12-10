/**
 * Clip Properties Panel
 * Premium right-side panel for editing selected clip properties
 */

import { useState, useCallback, useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Sliders,
  Scissors,
  Clock,
  Film,
  Palette,
  Sparkles,
  Copy,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Clip, Track } from '@/types/editor';

interface ClipPropertiesPanelProps {
  clip: Clip | null;
  track: Track | null;
  onClose: () => void;
  onUpdateClip: (clipId: string, updates: Partial<Clip>) => void;
  onDuplicateClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onSplitClip: (clipId: string, time: number) => void;
  currentTime: number;
}

export default function ClipPropertiesPanel({
  clip,
  track,
  onClose,
  onUpdateClip,
  onDuplicateClip,
  onDeleteClip,
  onSplitClip,
  currentTime,
}: ClipPropertiesPanelProps) {
  const [openSections, setOpenSections] = useState({
    timing: true,
    audio: true,
    effects: false,
    info: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  if (!clip) {
    return (
      <div className="w-72 bg-card/50 border-l border-border/50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
          <Sliders className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="font-medium mb-1">No Clip Selected</p>
        <p className="text-sm text-muted-foreground">
          Select a clip on the timeline to view and edit its properties
        </p>
      </div>
    );
  }

  const canSplitAtPlayhead =
    currentTime > clip.startTime &&
    currentTime < clip.startTime + clip.duration;

  return (
    <motion.div
      className="w-72 bg-card/50 border-l border-border/50 flex flex-col"
      initial={{ x: 72, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 72, opacity: 0 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Clip Properties</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Clip Preview */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
            {clip.thumbnailUrl ? (
              <img
                src={clip.thumbnailUrl}
                alt="Clip thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={clip.sourceUrl}
                className="w-full h-full object-cover"
                muted
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-xs text-white line-clamp-2">
                {clip.prompt || 'Untitled Clip'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onDuplicateClip(clip.id)}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onSplitClip(clip.id, currentTime)}
              disabled={!canSplitAtPlayhead}
            >
              <Scissors className="h-3.5 w-3.5 mr-1.5" />
              Split
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDeleteClip(clip.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Timing Section */}
          <Collapsible
            open={openSections.timing}
            onOpenChange={() => toggleSection('timing')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Timing</span>
              </div>
              {openSections.timing ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <div className="h-8 px-2 bg-muted/50 rounded flex items-center text-xs font-mono">
                    {formatTime(clip.startTime)}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <div className="h-8 px-2 bg-muted/50 rounded flex items-center text-xs font-mono">
                    {formatTime(clip.startTime + clip.duration)}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Duration</Label>
                <div className="h-8 px-2 bg-muted/50 rounded flex items-center justify-between text-xs">
                  <span className="font-mono">{formatTime(clip.duration)}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {(clip.duration * 30).toFixed(0)} frames
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">In Point</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatTime(clip.inPoint)}
                  </span>
                </div>
                <Slider
                  value={[clip.inPoint]}
                  min={0}
                  max={clip.sourceDuration}
                  step={0.033}
                  onValueChange={([value]) =>
                    onUpdateClip(clip.id, { inPoint: value })
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Out Point</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatTime(clip.outPoint)}
                  </span>
                </div>
                <Slider
                  value={[clip.outPoint]}
                  min={0}
                  max={clip.sourceDuration}
                  step={0.033}
                  onValueChange={([value]) =>
                    onUpdateClip(clip.id, { outPoint: value })
                  }
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Audio Section */}
          <Collapsible
            open={openSections.audio}
            onOpenChange={() => toggleSection('audio')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                {clip.audioEnabled ? (
                  <Volume2 className="h-4 w-4 text-primary" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">Audio</span>
              </div>
              {openSections.audio ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Enable Audio</Label>
                <Switch
                  checked={clip.audioEnabled}
                  onCheckedChange={(checked) =>
                    onUpdateClip(clip.id, { audioEnabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Volume</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(clip.volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[clip.volume * 100]}
                  min={0}
                  max={100}
                  step={1}
                  disabled={!clip.audioEnabled}
                  onValueChange={([value]) =>
                    onUpdateClip(clip.id, { volume: value / 100 })
                  }
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Effects Section */}
          <Collapsible
            open={openSections.effects}
            onOpenChange={() => toggleSection('effects')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Effects</span>
                <Badge variant="secondary" className="text-[10px]">
                  Pro
                </Badge>
              </div>
              {openSections.effects ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Opacity</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(clip.opacity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[clip.opacity * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) =>
                    onUpdateClip(clip.id, { opacity: value / 100 })
                  }
                />
              </div>

              {/* Coming Soon Features */}
              <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Coming Soon</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Color grading</li>
                  <li>• Speed ramping</li>
                  <li>• AI style transfer</li>
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Info Section */}
          <Collapsible
            open={openSections.info}
            onOpenChange={() => toggleSection('info')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Source Info</span>
              </div>
              {openSections.info ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Track</span>
                  <span>{track?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source Duration</span>
                  <span className="font-mono">{formatTime(clip.sourceDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clip ID</span>
                  <span className="font-mono text-[10px]">{clip.id.slice(0, 8)}</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 bg-card/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Press <kbd className="px-1 rounded bg-muted">Esc</kbd> to deselect
        </p>
      </div>
    </motion.div>
  );
}

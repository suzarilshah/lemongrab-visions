/**
 * AI Filler Generator Dialog
 * UI for detecting gaps and generating AI filler content
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Wand2,
  Clock,
  Film,
  Play,
  Loader2,
  Check,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { EditorProject, Clip } from '@/types/editor';
import {
  Gap,
  FillerProgress,
  findGaps,
  suggestFillers,
  generateFillerForGap,
  generateFillerPrompt,
} from '@/lib/editor/fillerGenerator';

interface FillerGeneratorDialogProps {
  project: EditorProject | null;
  onFillerGenerated: (gap: Gap, result: { url: string; id: string; duration: number }) => void;
  trigger?: React.ReactNode;
}

type TransitionStyle = 'smooth' | 'dramatic' | 'match';

interface GapSuggestion {
  gap: Gap;
  suggestedPrompt: string;
  suggestedDuration: number;
  customPrompt?: string;
}

export default function FillerGeneratorDialog({
  project,
  onFillerGenerated,
  trigger,
}: FillerGeneratorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<GapSuggestion[]>([]);
  const [selectedGapIndex, setSelectedGapIndex] = useState<number | null>(null);
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>('smooth');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<FillerProgress | null>(null);
  const [generatedResults, setGeneratedResults] = useState<Map<number, { url: string; id: string; duration: number }>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Analyze timeline for gaps when dialog opens
  const analyzeTimeline = useCallback(() => {
    if (!project) return;

    const fillerSuggestions = suggestFillers(project, {
      minGapDuration: 2,
      transitionStyle,
    });

    setSuggestions(fillerSuggestions.map(s => ({
      ...s,
      customPrompt: undefined,
    })));

    setSelectedGapIndex(fillerSuggestions.length > 0 ? 0 : null);
    setGeneratedResults(new Map());
    setError(null);
  }, [project, transitionStyle]);

  // Handle dialog open
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      analyzeTimeline();
    }
  };

  // Update prompts when style changes
  const handleStyleChange = (style: TransitionStyle) => {
    setTransitionStyle(style);
    setSuggestions(prev => prev.map(s => ({
      ...s,
      suggestedPrompt: generateFillerPrompt(s.gap, style),
    })));
  };

  // Update custom prompt
  const handlePromptChange = (index: number, prompt: string) => {
    setSuggestions(prev => prev.map((s, i) =>
      i === index ? { ...s, customPrompt: prompt } : s
    ));
  };

  // Generate filler for a specific gap
  const handleGenerate = async (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return;

    setIsGenerating(true);
    setError(null);
    setSelectedGapIndex(index);

    try {
      const result = await generateFillerForGap(
        suggestion.gap,
        {
          targetDuration: suggestion.suggestedDuration,
          transitionStyle,
        },
        setProgress
      );

      if (result) {
        setGeneratedResults(prev => new Map(prev).set(index, result));
        onFillerGenerated(suggestion.gap, result);
      } else {
        setError('Failed to generate filler content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasGaps = suggestions.length > 0;
  const hasClips = project?.tracks.some(t => t.clips.length > 0) ?? false;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Filler
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Filler Content Generator
          </DialogTitle>
          <DialogDescription>
            Automatically detect gaps in your timeline and generate AI content to fill them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* No clips warning */}
          {!hasClips && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-500">No clips in timeline</p>
                <p className="text-sm text-muted-foreground">
                  Add some clips to the timeline first, then use this feature to fill gaps.
                </p>
              </div>
            </div>
          )}

          {/* No gaps found */}
          {hasClips && !hasGaps && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <Check className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-green-500">No gaps detected</p>
                <p className="text-sm text-muted-foreground">
                  Your timeline has no gaps that need filling. Great job!
                </p>
              </div>
            </div>
          )}

          {/* Gap suggestions */}
          {hasGaps && !isGenerating && (
            <>
              {/* Style selector */}
              <div className="space-y-3">
                <Label>Transition Style</Label>
                <RadioGroup
                  value={transitionStyle}
                  onValueChange={(v) => handleStyleChange(v as TransitionStyle)}
                  className="grid grid-cols-3 gap-2"
                >
                  {[
                    { value: 'smooth', label: 'Smooth', desc: 'Gentle transitions' },
                    { value: 'dramatic', label: 'Dramatic', desc: 'Impactful effects' },
                    { value: 'match', label: 'Match', desc: 'Match themes' },
                  ].map((style) => (
                    <Label
                      key={style.value}
                      htmlFor={style.value}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all',
                        transitionStyle === style.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <RadioGroupItem
                        value={style.value}
                        id={style.value}
                        className="sr-only"
                      />
                      <span className="font-medium text-sm">{style.label}</span>
                      <span className="text-xs text-muted-foreground">{style.desc}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Gap list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Detected Gaps ({suggestions.length})</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={analyzeTimeline}
                    className="h-7 gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </Button>
                </div>

                <ScrollArea className="h-[300px] rounded-lg border">
                  <div className="p-3 space-y-3">
                    {suggestions.map((suggestion, index) => {
                      const generated = generatedResults.get(index);
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            'p-4 rounded-lg border transition-all cursor-pointer',
                            selectedGapIndex === index
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50',
                            generated && 'border-green-500/50 bg-green-500/5'
                          )}
                          onClick={() => setSelectedGapIndex(index)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              {/* Gap info */}
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(suggestion.gap.startTime)} - {formatTime(suggestion.gap.endTime)}
                                </Badge>
                                <Badge variant="secondary">
                                  {suggestion.gap.duration.toFixed(1)}s gap
                                </Badge>
                                {generated && (
                                  <Badge className="bg-green-500 text-white">
                                    <Check className="h-3 w-3 mr-1" />
                                    Generated
                                  </Badge>
                                )}
                              </div>

                              {/* Context clips */}
                              <div className="text-xs text-muted-foreground space-y-1">
                                {suggestion.gap.prevClip && (
                                  <p className="line-clamp-1">
                                    <span className="text-foreground">Before:</span>{' '}
                                    {suggestion.gap.prevClip.prompt?.slice(0, 60) || 'Untitled clip'}
                                  </p>
                                )}
                                {suggestion.gap.nextClip && (
                                  <p className="line-clamp-1">
                                    <span className="text-foreground">After:</span>{' '}
                                    {suggestion.gap.nextClip.prompt?.slice(0, 60) || 'Untitled clip'}
                                  </p>
                                )}
                              </div>

                              {/* Suggested prompt (expandable on selection) */}
                              {selectedGapIndex === index && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="pt-2 space-y-2"
                                >
                                  <Label className="text-xs">AI Prompt</Label>
                                  <Textarea
                                    value={suggestion.customPrompt ?? suggestion.suggestedPrompt}
                                    onChange={(e) => handlePromptChange(index, e.target.value)}
                                    className="text-sm min-h-[80px]"
                                    placeholder="AI-generated prompt for filler content..."
                                  />
                                </motion.div>
                              )}
                            </div>

                            {/* Generate button */}
                            <div className="flex flex-col items-end gap-2">
                              {generated ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-green-600"
                                  disabled
                                >
                                  <Check className="h-4 w-4" />
                                  Added
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="gap-1 btn-premium"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGenerate(index);
                                  }}
                                >
                                  <Zap className="h-4 w-4" />
                                  Generate
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* Generation progress */}
          {isGenerating && progress && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-6">
                <motion.div
                  className="relative"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="h-12 w-12 text-primary" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {progress.message || 'Generating filler content...'}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(progress.progress)}%
                  </span>
                </div>
                <Progress value={progress.progress} className="h-2" />
              </div>

              {progress.gap && (
                <div className="text-center text-sm text-muted-foreground">
                  Filling gap from {formatTime(progress.gap.startTime)} to {formatTime(progress.gap.endTime)}
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && !isGenerating && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Generation Failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {generatedResults.size > 0 && (
              <span className="text-green-600">
                {generatedResults.size} of {suggestions.length} gaps filled
              </span>
            )}
          </div>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {generatedResults.size > 0 ? 'Done' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

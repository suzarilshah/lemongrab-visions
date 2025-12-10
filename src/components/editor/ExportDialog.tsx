/**
 * Export Dialog Component
 * Settings and progress UI for video export
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Settings2,
  Film,
  Volume2,
  VolumeX,
  Loader2,
  Check,
  AlertCircle,
  X,
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { EditorProject, ExportSettings, ExportProgress } from '@/types/editor';
import {
  exportProject,
  ExportResult,
  DEFAULT_EXPORT_SETTINGS,
  QUALITY_PRESETS,
  RESOLUTION_PRESETS,
  formatFileSize,
  formatDuration,
} from '@/lib/editor/videoProcessor';

interface ExportDialogProps {
  project: EditorProject | null;
  trigger?: React.ReactNode;
}

export default function ExportDialog({ project, trigger }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const hasClips = project?.tracks.some(t => t.clips.length > 0) ?? false;

  const handleExport = useCallback(async () => {
    if (!project || !hasClips) return;

    setIsExporting(true);
    setProgress({ stage: 'preparing', progress: 0 });
    setError(null);
    setResult(null);

    try {
      const exportResult = await exportProject(project, settings, setProgress);
      setResult(exportResult);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
      setProgress({ stage: 'error', progress: 0, message: 'Export failed' });
    } finally {
      setIsExporting(false);
    }
  }, [project, settings, hasClips]);

  const handleDownload = useCallback(() => {
    if (!result) return;

    const a = document.createElement('a');
    a.href = result.url;
    a.download = `${project?.name || 'video'}_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [result, project?.name]);

  const handleClose = useCallback(() => {
    if (isExporting) return;

    // Cleanup blob URL
    if (result?.url) {
      URL.revokeObjectURL(result.url);
    }

    setIsOpen(false);
    setProgress(null);
    setResult(null);
    setError(null);
  }, [isExporting, result?.url]);

  const getProgressMessage = () => {
    if (!progress) return '';
    switch (progress.stage) {
      case 'preparing':
        return 'Loading video processor...';
      case 'processing':
        return progress.message || `Processing clip ${progress.currentClip}/${progress.totalClips}`;
      case 'encoding':
        return 'Encoding video...';
      case 'finalizing':
        return 'Finalizing export...';
      case 'complete':
        return 'Export complete!';
      case 'error':
        return error || 'Export failed';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger || (
          <Button onClick={() => setIsOpen(true)} className="btn-premium">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Export Video
          </DialogTitle>
          <DialogDescription>
            Configure your export settings and download your video.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* No clips warning */}
          {!hasClips && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-500">No clips to export</p>
                <p className="text-sm text-muted-foreground">
                  Add some clips to the timeline first.
                </p>
              </div>
            </div>
          )}

          {/* Settings (only show if not exporting) */}
          {!isExporting && !result && hasClips && (
            <>
              {/* Quality */}
              <div className="space-y-3">
                <Label>Quality</Label>
                <RadioGroup
                  value={settings.quality}
                  onValueChange={(v) =>
                    setSettings({ ...settings, quality: v as ExportSettings['quality'] })
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  {QUALITY_PRESETS.map((preset) => (
                    <Label
                      key={preset.value}
                      htmlFor={preset.value}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all',
                        settings.quality === preset.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <RadioGroupItem
                        value={preset.value}
                        id={preset.value}
                        className="sr-only"
                      />
                      <span className="font-medium">{preset.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {preset.bitrate}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Resolution */}
              <div className="space-y-3">
                <Label>Resolution</Label>
                <RadioGroup
                  value={`${settings.resolution.width}x${settings.resolution.height}`}
                  onValueChange={(v) => {
                    const [width, height] = v.split('x').map(Number);
                    setSettings({ ...settings, resolution: { width, height } });
                  }}
                  className="grid grid-cols-2 gap-2"
                >
                  {RESOLUTION_PRESETS.map((preset) => (
                    <Label
                      key={preset.label}
                      htmlFor={`${preset.width}x${preset.height}`}
                      className={cn(
                        'flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all',
                        settings.resolution.width === preset.width
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <RadioGroupItem
                        value={`${preset.width}x${preset.height}`}
                        id={`${preset.width}x${preset.height}`}
                        className="sr-only"
                      />
                      <span className="text-sm">{preset.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Audio toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.includeAudio ? (
                    <Volume2 className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <Label>Include Audio</Label>
                    <p className="text-xs text-muted-foreground">
                      Export with clip audio tracks
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.includeAudio}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, includeAudio: checked })
                  }
                />
              </div>
            </>
          )}

          {/* Progress */}
          {isExporting && progress && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
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
                  <span>{getProgressMessage()}</span>
                  <span className="text-muted-foreground">
                    {Math.round(progress.progress)}%
                  </span>
                </div>
                <Progress value={progress.progress} />
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="font-semibold">Export Complete!</p>
                <p className="text-sm text-muted-foreground">
                  Your video is ready to download.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Film className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      {project?.name || 'video'}.mp4
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(result.duration)} • {formatFileSize(result.size)}
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleDownload} className="w-full btn-premium">
                <Download className="h-4 w-4 mr-2" />
                Download Video
              </Button>
            </motion.div>
          )}

          {/* Error */}
          {error && !isExporting && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Export Failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isExporting && !result && hasClips && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleExport} className="flex-1 btn-premium">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        )}

        {result && (
          <Button variant="outline" onClick={handleClose} className="w-full">
            Close
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

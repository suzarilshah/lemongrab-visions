/**
 * Timeline Markers Component
 * Allows users to add, edit, and remove markers on the timeline
 */

import { useState, useCallback } from 'react';
import { Flag, Plus, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface Marker {
  id: string;
  time: number;
  label: string;
  color: string;
}

interface TimelineMarkersProps {
  markers: Marker[];
  currentTime: number;
  zoom: number;
  scrollLeft: number;
  onAddMarker: (marker: Omit<Marker, 'id'>) => void;
  onUpdateMarker: (markerId: string, updates: Partial<Marker>) => void;
  onDeleteMarker: (markerId: string) => void;
  onMarkerClick: (time: number) => void;
}

const MARKER_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
];

export default function TimelineMarkers({
  markers,
  currentTime,
  zoom,
  scrollLeft,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
  onMarkerClick,
}: TimelineMarkersProps) {
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [newMarkerLabel, setNewMarkerLabel] = useState('');
  const [newMarkerColor, setNewMarkerColor] = useState(MARKER_COLORS[0].value);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);

  const handleAddMarker = useCallback(() => {
    if (!newMarkerLabel.trim()) return;

    onAddMarker({
      time: currentTime,
      label: newMarkerLabel,
      color: newMarkerColor,
    });

    setNewMarkerLabel('');
    setNewMarkerColor(MARKER_COLORS[0].value);
    setIsAddingMarker(false);
  }, [currentTime, newMarkerLabel, newMarkerColor, onAddMarker]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative h-6 bg-card/60 border-b border-border/50">
      {/* Add marker button */}
      <Popover open={isAddingMarker} onOpenChange={setIsAddingMarker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-5 px-2 text-xs gap-1"
          >
            <Flag className="h-3 w-3" />
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">Add Marker at {formatTime(currentTime)}</div>

            <Input
              placeholder="Marker label..."
              value={newMarkerLabel}
              onChange={(e) => setNewMarkerLabel(e.target.value)}
              className="h-8"
              autoFocus
            />

            <div className="flex gap-1">
              {MARKER_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    newMarkerColor === color.value
                      ? 'border-white scale-110'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  )}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setNewMarkerColor(color.value)}
                  title={color.label}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setIsAddingMarker(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleAddMarker}
                disabled={!newMarkerLabel.trim()}
              >
                Add Marker
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Markers */}
      <div className="absolute left-44 right-0 top-0 h-full overflow-hidden">
        <AnimatePresence>
          {markers.map((marker) => {
            const position = marker.time * zoom - scrollLeft;

            // Only render if visible
            if (position < -20 || position > window.innerWidth) return null;

            return (
              <Tooltip key={marker.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    className="absolute top-0 cursor-pointer group"
                    style={{ left: position }}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => onMarkerClick(marker.time)}
                  >
                    {/* Marker flag */}
                    <div
                      className="w-3 h-6 relative"
                      style={{ color: marker.color }}
                    >
                      <Flag className="h-4 w-4 fill-current" />
                    </div>

                    {/* Delete button on hover */}
                    <button
                      className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMarker(marker.id);
                      }}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{marker.label}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(marker.time)}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

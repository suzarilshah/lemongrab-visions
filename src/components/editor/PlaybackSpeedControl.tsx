/**
 * Playback Speed Control Component
 * Dropdown for controlling video playback speed
 */

import { useState } from 'react';
import { Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface PlaybackSpeedControlProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const SPEED_OPTIONS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x (Normal)' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
];

export default function PlaybackSpeedControl({
  speed,
  onSpeedChange,
}: PlaybackSpeedControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentLabel = SPEED_OPTIONS.find((opt) => opt.value === speed)?.label || `${speed}x`;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2 gap-1.5 font-mono text-xs',
            speed !== 1 && 'text-primary'
          )}
        >
          <Gauge className="h-3.5 w-3.5" />
          {speed !== 1 ? `${speed}x` : 'Speed'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-40">
        <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SPEED_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => {
              onSpeedChange(option.value);
              setIsOpen(false);
            }}
            className={cn(
              'cursor-pointer',
              speed === option.value && 'bg-primary/10 text-primary'
            )}
          >
            {option.label}
            {speed === option.value && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

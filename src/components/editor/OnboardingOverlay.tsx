/**
 * Onboarding Overlay Component
 * Premium first-time user experience for the video editor
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film,
  MousePointerClick,
  Scissors,
  Music,
  Sparkles,
  Download,
  ChevronRight,
  X,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  highlight?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: Film,
    title: 'Media Library',
    description: 'Your AI-generated videos appear here. Generate new videos directly or browse existing ones.',
    highlight: 'media-library',
  },
  {
    icon: MousePointerClick,
    title: 'Drag & Drop',
    description: 'Simply drag videos from the library onto the timeline. Drop them on any track to add them.',
    highlight: 'timeline',
  },
  {
    icon: Scissors,
    title: 'Trim & Edit',
    description: 'Click and drag the edges of clips to trim. Double-click to split clips at any point.',
    highlight: 'clip',
  },
  {
    icon: Music,
    title: 'Audio Control',
    description: 'Toggle audio on/off for each clip. Adjust volume levels in the properties panel.',
    highlight: 'audio',
  },
  {
    icon: Sparkles,
    title: 'AI Filler',
    description: 'Detect gaps in your timeline and automatically generate AI content to fill them.',
    highlight: 'ai-filler',
  },
  {
    icon: Download,
    title: 'Export',
    description: 'When you\'re done, export your project as an MP4 video in various quality options.',
    highlight: 'export',
  },
];

interface OnboardingOverlayProps {
  isVisible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
}

export default function OnboardingOverlay({
  isVisible,
  onDismiss,
  onComplete,
}: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onDismiss();
  };

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleSkip} />

        {/* Content */}
        <motion.div
          className="relative z-10 max-w-lg w-full mx-4"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          {/* Card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-10 h-8 w-8"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Header */}
            <div className="relative p-8 pb-6 bg-gradient-to-b from-primary/20 to-transparent">
              <div className="flex items-center justify-center mb-6">
                <motion.div
                  className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <StepIcon className="h-10 w-10 text-primary" />
                </motion.div>
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 py-4">
              {ONBOARDING_STEPS.map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    index === currentStep
                      ? 'w-6 bg-primary'
                      : index < currentStep
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  )}
                  onClick={() => setCurrentStep(index)}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="p-6 pt-2 flex items-center justify-between">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tour
              </Button>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handlePrevious}>
                    Previous
                  </Button>
                )}
                <Button onClick={handleNext} className="btn-premium gap-1.5">
                  {currentStep < ONBOARDING_STEPS.length - 1 ? (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Start Editing
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <p className="text-center text-sm text-muted-foreground mt-4">
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import PriceEstimator from "@/components/PriceEstimator";
import SoraLimitationsDialog from "@/components/SoraLimitationsDialog";

interface VideoGenerationFormProps {
  onGenerate: (params: {
    prompt: string;
    height: string;
    width: string;
    duration: number;
    variants: string;
  }) => Promise<void>;
  isGenerating: boolean;
  progress: number;
  progressMessage: string;
}

export default function VideoGenerationForm({
  onGenerate,
  isGenerating,
  progress,
  progressMessage,
}: VideoGenerationFormProps) {
  const [prompt, setPrompt] = useState("");
  const [height, setHeight] = useState("720");
  const [width, setWidth] = useState("1280");
  const [duration, setDuration] = useState("12");
  const [variants, setVariants] = useState("1");

  const handleSubmit = async () => {
    await onGenerate({
      prompt,
      height,
      width,
      duration: parseInt(duration),
      variants,
    });
    setPrompt("");
  };

  return (
    <Card className="glass glow border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Generate Video with Sora-2</CardTitle>
            <CardDescription>
              Describe your video and customize the generation parameters
            </CardDescription>
          </div>
          <SoraLimitationsDialog />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Video Prompt</Label>
          <Textarea
            id="prompt"
            placeholder="A train journey through mountains, with scenic views and dramatic lighting..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] glass border-primary/20 resize-none"
            disabled={isGenerating}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_300px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Width (px)</Label>
              <Input
                id="width"
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="glass border-primary/20"
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (px)</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="glass border-primary/20"
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (s)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                max="20"
                className="glass border-primary/20"
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variants">Variants</Label>
              <Input
                id="variants"
                type="number"
                value={variants}
                onChange={(e) => setVariants(e.target.value)}
                min="1"
                max="4"
                className="glass border-primary/20"
                disabled={isGenerating}
              />
            </div>
          </div>
          
          <PriceEstimator
            width={width}
            height={height}
            duration={duration}
            variants={variants}
          />
        </div>

        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">{progressMessage}</p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
          size="lg"
        >
          <Play className="mr-2 h-5 w-5" />
          {isGenerating ? "Generating..." : "Generate Video"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Videos are generated using Azure OpenAI Sora model. Generation typically takes 1-3 minutes.
        </p>
      </CardContent>
    </Card>
  );
}

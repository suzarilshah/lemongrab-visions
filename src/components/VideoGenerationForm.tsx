import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Play, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import PriceEstimator from "@/components/PriceEstimator";

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

const RESOLUTIONS = [
  { value: "480x480", label: "480x480 (Square)" },
  { value: "480x854", label: "480x854 (Portrait)" },
  { value: "854x480", label: "854x480 (Landscape)" },
  { value: "720x720", label: "720x720 (Square)" },
  { value: "720x1280", label: "720x1280 (Portrait)" },
  { value: "1280x720", label: "1280x720 (Landscape)" },
  { value: "1080x1080", label: "1080x1080 (Square)" },
  { value: "1080x1920", label: "1080x1920 (Portrait)" },
  { value: "1920x1080", label: "1920x1080 (Landscape)" },
];

const SORA2_RESOLUTIONS = [
  { value: "720x1280", label: "720x1280 (Portrait)" },
  { value: "1280x720", label: "1280x720 (Landscape)" },
];

const SORA2_DURATIONS = [
  { value: "4", label: "4 seconds" },
  { value: "8", label: "8 seconds" },
  { value: "12", label: "12 seconds" },
];

export default function VideoGenerationForm({
  onGenerate,
  isGenerating,
  progress,
  progressMessage,
}: VideoGenerationFormProps) {
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState("1280x720");
  const [duration, setDuration] = useState("12");
  const [variants, setVariants] = useState("1");
  const [soraVersion, setSoraVersion] = useState<string>("sora-1");
  const [mode, setMode] = useState<string>("text-to-video");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    loadSoraVersion();
  }, []);

  const loadSoraVersion = () => {
    const stored = localStorage.getItem("lemongrab_settings");
    if (stored) {
      const settings = JSON.parse(stored);
      setSoraVersion(settings.soraVersion || "sora-1");
      // Set default resolution based on version
      if (settings.soraVersion === "sora-2") {
        setResolution("720x1280");
        setDuration("4");
      }
    }
  };

  const [width, height] = resolution.split("x");

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
        <div>
          <CardTitle className="text-2xl">
            Generate Video with {soraVersion === "sora-1" ? "Sora 1" : "Sora 2"}
          </CardTitle>
          <CardDescription>
            Describe your video and customize the generation parameters
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {soraVersion === "sora-2" && (
          <div className="space-y-2">
            <Label htmlFor="mode">Generation Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger id="mode" className="glass border-primary/20">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text-to-video">Text to Video</SelectItem>
                <SelectItem value="image-to-video">Image to Video</SelectItem>
                <SelectItem value="video-to-video">Video-to-Video (Remix)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {soraVersion === "sora-2" && mode === "image-to-video" && (
          <div className="space-y-2">
            <Label htmlFor="imageUpload">Upload Reference Image</Label>
            <div className="flex items-center gap-2">
              <Input
                id="imageUpload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="glass border-primary/20"
                disabled={isGenerating}
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Supported formats: JPEG, PNG, WebP
            </p>
          </div>
        )}

        {soraVersion === "sora-2" && mode === "video-to-video" && (
          <div className="space-y-2">
            <Label htmlFor="videoUpload">Upload Reference Video</Label>
            <div className="flex items-center gap-2">
              <Input
                id="videoUpload"
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="glass border-primary/20"
                disabled={isGenerating}
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a previously generated video to remix
            </p>
          </div>
        )}

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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger id="resolution" className="glass border-primary/20">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  {(soraVersion === "sora-2" ? SORA2_RESOLUTIONS : RESOLUTIONS).map((res) => (
                    <SelectItem key={res.value} value={res.value}>
                      {res.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              {soraVersion === "sora-2" ? (
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="duration" className="glass border-primary/20">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORA2_DURATIONS.map((dur) => (
                      <SelectItem key={dur.value} value={dur.value}>
                        {dur.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
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
              )}
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

            {soraVersion === "sora-2" && (
              <div className="space-y-2">
                <Label htmlFor="audio">Generate Audio</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="audio"
                    checked={generateAudio}
                    onCheckedChange={setGenerateAudio}
                    disabled={isGenerating}
                  />
                  <span className="text-sm text-muted-foreground">
                    {generateAudio ? "With sound" : "Silent"}
                  </span>
                </div>
              </div>
            )}
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
          Videos are generated using Azure OpenAI {soraVersion === "sora-1" ? "Sora 1" : "Sora 2"} model. 
          Generation typically takes 1-3 minutes.
        </p>
      </CardContent>
    </Card>
  );
}

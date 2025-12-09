import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Upload, Sparkles, Mic, MicOff, Wand2, Film, Image, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import PriceEstimator from "@/components/PriceEstimator";
import { listVideos } from "@/lib/videoGenerator";
import { getActiveProfile } from "@/lib/profiles";
import PromptBuilderModal from "@/components/PromptBuilderModal";
import { useSpeechToText } from "@/hooks/useSpeechToText";

interface VideoGenerationFormProps {
  onGenerate: (params: {
    prompt: string;
    height: string;
    width: string;
    duration: number;
    variants: string;
    audio?: boolean;
    inputReference?: File;
    remixVideoId?: string;
  }) => Promise<void>;
  isGenerating: boolean;
  progress: number;
  progressMessage: string;
}

const RESOLUTIONS = [
  { value: "480x480", label: "480×480 (Square)" },
  { value: "480x854", label: "480×854 (Portrait)" },
  { value: "854x480", label: "854×480 (Landscape)" },
  { value: "720x720", label: "720×720 (Square)" },
  { value: "720x1280", label: "720×1280 (Portrait)" },
  { value: "1280x720", label: "1280×720 (Landscape)" },
  { value: "1080x1080", label: "1080×1080 (Square)" },
  { value: "1080x1920", label: "1080×1920 (Portrait)" },
  { value: "1920x1080", label: "1920×1080 (Landscape)" },
];

const SORA2_RESOLUTIONS = [
  { value: "720x1280", label: "720×1280 (Portrait)" },
  { value: "1280x720", label: "1280×720 (Landscape)" },
];

const SORA2_IMAGE_TO_VIDEO_RESOLUTIONS = [
  { value: "1280x720", label: "1280×720 (Landscape)" },
  { value: "720x1280", label: "720×1280 (Portrait)" },
];

const SORA2_DURATIONS = [
  { value: "4", label: "4 seconds" },
  { value: "8", label: "8 seconds" },
  { value: "12", label: "12 seconds" },
  { value: "20", label: "20 seconds" },
];

const GENERATION_MODES = [
  { value: "text-to-video", label: "Text to Video", icon: Wand2, description: "Generate from text description" },
  { value: "image-to-video", label: "Image to Video", icon: Image, description: "Animate a reference image" },
  { value: "video-to-video", label: "Video Remix", icon: RefreshCw, description: "Remix an existing video" },
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
  const [availableVideos, setAvailableVideos] = useState<Array<{ id: string; status: string; model: string }>>([]);
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);
  const { isListening, startListening, stopListening } = useSpeechToText();
  const [remixVideoId, setRemixVideoId] = useState("");

  useEffect(() => {
    loadSoraVersion();
  }, []);

  useEffect(() => {
    if (soraVersion === "sora-2" && mode === "video-to-video") {
      loadAvailableVideos();
    }
  }, [soraVersion, mode]);

  const loadAvailableVideos = async () => {
    const profile = await getActiveProfile();
    if (!profile) return;
    const videos = await listVideos(profile.endpoint, profile.apiKey);
    setAvailableVideos(videos.filter(v => v.status === "completed"));
  };

  const loadSoraVersion = async () => {
    const profile = await getActiveProfile();
    if (profile) {
      setSoraVersion(profile.soraVersion || "sora-1");
      if (profile.soraVersion === "sora-2") {
        setResolution("1280x720");
        setDuration("4");
      }
    }
  };

  const [width, height] = resolution.split("x");

  const handleSpeechToText = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((transcript) => {
        setPrompt(transcript);
      });
    }
  };

  const handleSubmit = async () => {
    await onGenerate({
      prompt,
      height,
      width,
      duration: parseInt(duration),
      variants,
      audio: generateAudio,
      inputReference: imageFile || undefined,
      remixVideoId: remixVideoId || undefined,
    });
    setPrompt("");
    setImageFile(null);
    setRemixVideoId("");
    setGenerateAudio(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="card-premium rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <Film className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              Generate with {soraVersion === "sora-1" ? "Sora 1" : "Sora 2"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create stunning AI videos from text descriptions
            </p>
          </div>
        </div>

        {/* Mode Selection for Sora 2 */}
        {soraVersion === "sora-2" && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {GENERATION_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                disabled={isGenerating}
                className={`p-4 rounded-xl border transition-all text-left ${
                  mode === m.value
                    ? "border-primary bg-primary/10 shadow-[0_0_20px_hsla(47,100%,50%,0.2)]"
                    : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <m.icon className={`h-5 w-5 mb-2 ${mode === m.value ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`font-medium text-sm ${mode === m.value ? "text-foreground" : "text-muted-foreground"}`}>
                  {m.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Image Upload for Image-to-Video */}
        {soraVersion === "sora-2" && mode === "image-to-video" && (
          <div className="mb-6 p-4 rounded-xl border border-dashed border-border/50 bg-card/50">
            <Label className="text-sm font-medium mb-2 block">Reference Image</Label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="input-premium"
                disabled={isGenerating}
              />
              <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Accepts JPEG, PNG, WebP. Image will be resized to match selected resolution.
            </p>
            {imageFile && (
              <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                <div className="w-2 h-2 rounded-full bg-primary" />
                {imageFile.name}
              </div>
            )}
          </div>
        )}

        {/* Video Selection for Video-to-Video */}
        {soraVersion === "sora-2" && mode === "video-to-video" && (
          <div className="mb-6 p-4 rounded-xl border border-dashed border-border/50 bg-card/50">
            <Label className="text-sm font-medium mb-2 block">Select Video to Remix</Label>
            <Select value={remixVideoId} onValueChange={setRemixVideoId}>
              <SelectTrigger className="input-premium">
                <SelectValue placeholder="Choose a video..." />
              </SelectTrigger>
              <SelectContent>
                {availableVideos.length === 0 ? (
                  <SelectItem value="no-videos" disabled>No completed videos available</SelectItem>
                ) : (
                  availableVideos.map((video, index) => (
                    <SelectItem key={video.id} value={video.id}>
                      {video.id.slice(0, 20)}... {index === 0 ? "(Latest)" : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Reuse the structure, motion, and framing from a previous video
            </p>
          </div>
        )}

        {/* Prompt Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="prompt" className="text-sm font-medium">
              Video Prompt
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSpeechToText}
                disabled={isGenerating}
                className={`h-8 text-xs ${isListening ? 'bg-destructive/10 border-destructive text-destructive' : 'hover:bg-primary/10 hover:border-primary/50'}`}
              >
                {isListening ? <MicOff className="h-3.5 w-3.5 mr-1.5" /> : <Mic className="h-3.5 w-3.5 mr-1.5" />}
                {isListening ? "Stop" : "Voice"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPromptBuilder(true)}
                disabled={isGenerating}
                className="h-8 text-xs hover:bg-primary/10 hover:border-primary/50"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI Generate
              </Button>
            </div>
          </div>
          
          <Textarea
            id="prompt"
            placeholder="Describe your video in detail... e.g., 'Aerial drone shot of a misty mountain range at sunrise, with golden light piercing through clouds, cinematic slow movement'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[140px] input-premium resize-none text-base leading-relaxed"
            disabled={isGenerating || isListening}
          />
          
          {isListening && (
            <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
              <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
              Listening... Speak your prompt
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            <strong>Pro tip:</strong> Include shot type, subject, action, setting, and lighting for best results
          </p>
        </div>

        <PromptBuilderModal
          open={showPromptBuilder}
          onOpenChange={setShowPromptBuilder}
          onUsePrompt={(generatedPrompt) => setPrompt(generatedPrompt)}
        />
      </div>

      {/* Settings Section */}
      {!(soraVersion === "sora-2" && mode === "video-to-video") && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Generation Settings */}
          <div className="card-premium rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
              Generation Settings
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="resolution" className="text-sm">Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="input-premium">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(soraVersion === "sora-2" && mode === "image-to-video" 
                      ? SORA2_IMAGE_TO_VIDEO_RESOLUTIONS 
                      : soraVersion === "sora-2" 
                      ? SORA2_RESOLUTIONS 
                      : RESOLUTIONS
                    ).map((res) => (
                      <SelectItem key={res.value} value={res.value}>
                        {res.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="text-sm">Duration</Label>
                {soraVersion === "sora-2" ? (
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="input-premium">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORA2_DURATIONS.map((dur) => (
                        <SelectItem key={dur.value} value={dur.value}>{dur.label}</SelectItem>
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
                    className="input-premium"
                    disabled={isGenerating}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="variants" className="text-sm">Variants</Label>
                <Input
                  id="variants"
                  type="number"
                  value={variants}
                  onChange={(e) => setVariants(e.target.value)}
                  min="1"
                  max="4"
                  className="input-premium"
                  disabled={isGenerating}
                />
              </div>
            </div>
          </div>
          
          {/* Cost Estimator */}
          <PriceEstimator
            width={width}
            height={height}
            duration={duration}
            variants={variants}
            soraVersion={soraVersion}
          />
        </div>
      )}

      {/* Progress Bar */}
      {isGenerating && (
        <div className="card-premium rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Generating your video...</span>
            <span className="text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">{progressMessage}</p>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleSubmit}
        disabled={isGenerating || !prompt.trim()}
        className="w-full h-14 text-lg font-semibold btn-premium"
        size="lg"
      >
        {isGenerating ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Generating...
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Play className="h-5 w-5" />
            Generate Video
          </div>
        )}
      </Button>
      
      <p className="text-xs text-center text-muted-foreground">
        Generation typically takes 1-3 minutes depending on complexity and duration
      </p>
    </div>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface PromptBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUsePrompt: (prompt: string) => void;
}

const CAMERA_SHOTS = [
  "Close-up",
  "Medium shot",
  "Wide shot",
  "Extreme close-up",
  "Long shot",
  "Full shot",
  "Over-the-shoulder",
  "Point-of-view (POV)",
];

const CAMERA_ANGLES = [
  "Eye-level",
  "Low-angle",
  "High-angle",
  "Bird's-eye view",
  "Dutch angle",
  "Worm's-eye view",
];

const CAMERA_MOVEMENTS = [
  "Static",
  "Pan",
  "Tilt",
  "Tracking shot",
  "Dolly shot",
  "Crane shot",
  "Steadicam",
  "Handheld",
  "Zoom",
];

const ARTISTIC_STYLES = [
  "Photorealistic",
  "Cinematic",
  "Anime",
  "Cartoon",
  "Oil painting",
  "Watercolor",
  "Cyberpunk",
  "Film noir",
  "Vintage",
  "Documentary",
  "Fantasy",
];

export default function PromptBuilderModal({ open, onOpenChange, onUsePrompt }: PromptBuilderModalProps) {
  const [subject, setSubject] = useState("");
  const [action, setAction] = useState("");
  const [environment, setEnvironment] = useState("");
  const [lighting, setLighting] = useState("");
  const [cameraShot, setCameraShot] = useState("");
  const [cameraAngle, setCameraAngle] = useState("");
  const [cameraMovement, setCameraMovement] = useState("");
  const [style, setStyle] = useState("");
  const [details, setDetails] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!subject.trim() || !action.trim()) {
      toast.error("Please fill in at least Subject and Action fields");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("https://syd.cloud.appwrite.io/v1/functions/generate-video-prompt/executions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": "lemongrab",
        },
        body: JSON.stringify({
          data: JSON.stringify({
            subject,
            action,
            environment,
            lighting,
            camera_shot: cameraShot,
            camera_angle: cameraAngle,
            camera_movement: cameraMovement,
            style,
            details,
          }),
        }),
      });

      const data = await response.json();
      
      if (data.status === "completed" && data.responseBody) {
        const result = JSON.parse(data.responseBody);
        if (result.prompt) {
          setGeneratedPrompt(result.prompt);
          toast.success("Prompt generated successfully!");
        } else {
          throw new Error(result.error || "Failed to generate prompt");
        }
      } else {
        throw new Error("Function execution failed");
      }
    } catch (error: any) {
      console.error("Error generating prompt:", error);
      toast.error(error.message || "Failed to generate prompt");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUsePrompt = () => {
    if (generatedPrompt.trim()) {
      onUsePrompt(generatedPrompt);
      onOpenChange(false);
      // Reset form
      setSubject("");
      setAction("");
      setEnvironment("");
      setLighting("");
      setCameraShot("");
      setCameraAngle("");
      setCameraMovement("");
      setStyle("");
      setDetails("");
      setGeneratedPrompt("");
      toast.success("Prompt applied!");
    } else {
      toast.error("Please generate a prompt first");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">✨ AI Prompt Builder</DialogTitle>
          <DialogDescription>
            Fill in the details below to generate an optimized video prompt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject(s) *</Label>
              <Input
                id="subject"
                placeholder="e.g., A small futuristic drone"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="glass border-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action(s) *</Label>
              <Input
                id="action"
                placeholder="e.g., Navigating busy city traffic"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="glass border-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Input
                id="environment"
                placeholder="e.g., Neon-lit cyberpunk city at night"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="glass border-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lighting">Lighting</Label>
              <Input
                id="lighting"
                placeholder="e.g., Rainy with reflections"
                value={lighting}
                onChange={(e) => setLighting(e.target.value)}
                className="glass border-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cameraShot">Camera Shot</Label>
              <Select value={cameraShot} onValueChange={setCameraShot}>
                <SelectTrigger id="cameraShot" className="glass border-primary/20">
                  <SelectValue placeholder="Select shot type" />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_SHOTS.map((shot) => (
                    <SelectItem key={shot} value={shot}>
                      {shot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cameraAngle">Camera Angle</Label>
              <Select value={cameraAngle} onValueChange={setCameraAngle}>
                <SelectTrigger id="cameraAngle" className="glass border-primary/20">
                  <SelectValue placeholder="Select angle" />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_ANGLES.map((angle) => (
                    <SelectItem key={angle} value={angle}>
                      {angle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cameraMovement">Camera Movement</Label>
              <Select value={cameraMovement} onValueChange={setCameraMovement}>
                <SelectTrigger id="cameraMovement" className="glass border-primary/20">
                  <SelectValue placeholder="Select movement" />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_MOVEMENTS.map((movement) => (
                    <SelectItem key={movement} value={movement}>
                      {movement}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Artistic Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger id="style" className="glass border-primary/20">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {ARTISTIC_STYLES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Video Details (Optional)</Label>
            <Input
              id="details"
              placeholder="e.g., Slow-motion, dramatic music cues, etc."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="glass border-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="generatedPrompt">Generated Prompt:</Label>
            <Textarea
              id="generatedPrompt"
              value={generatedPrompt}
              readOnly
              placeholder="Your generated prompt will appear here..."
              className="min-h-[120px] glass border-primary/20 resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t sticky bottom-0 bg-background">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Close
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !subject.trim() || !action.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </Button>
            <Button
              onClick={handleUsePrompt}
              disabled={!generatedPrompt.trim()}
              variant="default"
              size="lg"
              aria-label="Use generated prompt"
            >
              <Check className="mr-2 h-4 w-4" />
              Use This Prompt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

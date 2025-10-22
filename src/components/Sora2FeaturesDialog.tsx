import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Sora2FeaturesDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Sora 2 Features
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sora 2 New Features & Capabilities</DialogTitle>
          <DialogDescription>
            Enhanced video generation with new modalities and audio support
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 text-sm">
            <div className="space-y-3">
              <h3 className="font-semibold text-base">Variation Modalities</h3>
              <p className="text-muted-foreground">
                Unlike Sora 1, which was almost exclusively text-to-video, Sora 2 officially supports three distinct modes:
              </p>
              
              <div className="space-y-2 pl-4">
                <div className="space-y-1">
                  <h4 className="font-medium">1. Text-to-Video</h4>
                  <p className="text-muted-foreground">
                    The standard mode where you provide a text prompt.
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-medium">2. Image-to-Video</h4>
                  <p className="text-muted-foreground">
                    You can provide a reference image, and the model will generate a video that starts from or is visually anchored to that image.
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-medium">3. Video-to-Video ("Remix")</h4>
                  <p className="text-muted-foreground">
                    You can provide the ID of a previously generated video to create a new video that "remixes" it by making targeted adjustments while reusing the structure and motion.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">Audio Generation</h3>
              <p className="text-muted-foreground">
                Sora 2 now generates synchronized audio (dialogue, sound effects, ambience) with the video. This was a major limitation of Sora 1, which produced silent videos.
              </p>
            </div>

            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-3">
              <h3 className="font-semibold text-base text-destructive">Resolution and Duration Limitations</h3>
              <p className="text-muted-foreground text-xs">
                The current public preview of Sora 2 on Azure has defined, non-flexible options:
              </p>
              
              <div className="space-y-2">
                <div>
                  <h4 className="font-medium text-sm">Resolution</h4>
                  <p className="text-muted-foreground text-xs">
                    You must choose from one of two supported aspect ratios:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs ml-2">
                    <li><strong>Portrait:</strong> 720x1280</li>
                    <li><strong>Landscape:</strong> 1280x720</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm">Duration</h4>
                  <p className="text-muted-foreground text-xs">
                    You must choose one of the following exact video lengths:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs ml-2">
                    <li>4 seconds</li>
                    <li>8 seconds</li>
                    <li>12 seconds</li>
                  </ul>
                  <p className="text-muted-foreground text-xs italic mt-1">
                    Default duration is 4 seconds if not specified.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h3 className="font-semibold text-base">Other Service Limitations</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                <li><strong>Concurrency:</strong> You are limited to two parallel (concurrent) video creation jobs at a time.</li>
                <li><strong>Job Availability:</strong> A completed video generation job and its downloadable video file are only available for 24 hours after creation.</li>
              </ul>
            </div>

            <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-3">
              <h3 className="font-semibold text-base">New API Parameters (Sora 2)</h3>
              <p className="text-muted-foreground text-xs">
                Sora 2 adapts OpenAI's latest Sora API using the v1 API format (not Azure-specific like Sora 1):
              </p>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium">prompt</span> <span className="text-muted-foreground">(String, Required)</span>
                  <p className="text-muted-foreground ml-4">The natural language description of the video you want to create.</p>
                </div>
                <div>
                  <span className="font-medium">model</span> <span className="text-muted-foreground">(String, Optional)</span>
                  <p className="text-muted-foreground ml-4">The name of your model deployment (e.g., sora-2).</p>
                </div>
                <div>
                  <span className="font-medium">size</span> <span className="text-muted-foreground">(String, Optional, NEW)</span>
                  <p className="text-muted-foreground ml-4">The resolution and aspect ratio. Must be either 720x1280 (Portrait) or 1280x720 (Landscape). Defaults to 720x1280.</p>
                </div>
                <div>
                  <span className="font-medium">seconds</span> <span className="text-muted-foreground">(String, Optional, NEW)</span>
                  <p className="text-muted-foreground ml-4">The duration of the video. Must be 4, 8, or 12. Defaults to 4.</p>
                </div>
                <div>
                  <span className="font-medium">input_reference</span> <span className="text-muted-foreground">(File, Optional, NEW)</span>
                  <p className="text-muted-foreground ml-4">A single reference image file (JPEG, PNG, WebP) to be used for image-to-video generation.</p>
                </div>
                <div>
                  <span className="font-medium">remix_video_id</span> <span className="text-muted-foreground">(String, Optional, NEW)</span>
                  <p className="text-muted-foreground ml-4">The ID of a previously completed video job (e.g., gen_...) to be used for video-to-video remixing.</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">📚 Documentation</p>
              <p className="text-xs text-muted-foreground mt-2">
                For more information, visit the{" "}
                <a 
                  href="https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/video-generation?source=recommendations&tabs=python-key"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Azure AI Foundry Documentation
                </a>
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

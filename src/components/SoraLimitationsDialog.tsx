import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SoraLimitationsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <InfoIcon className="h-4 w-4" />
          Sora Limitations
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sora Technical Limitations</DialogTitle>
          <DialogDescription>
            Important constraints and requirements when using Sora for video generation
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold text-base">Resolution Support</h3>
              <p className="text-muted-foreground">
                Sora supports the following output resolution dimensions:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>480x480 (Square)</li>
                <li>480x854 (Portrait)</li>
                <li>854x480 (Landscape)</li>
                <li>720x720 (Square)</li>
                <li>720x1280 (Portrait)</li>
                <li>1280x720 (Landscape)</li>
                <li>1080x1080 (Square)</li>
                <li>1080x1920 (Portrait)</li>
                <li>1920x1080 (Landscape)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">Video Duration</h3>
              <p className="text-muted-foreground">
                Sora can produce videos between <strong>1 and 20 seconds</strong> long.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">Multiple Variants</h3>
              <p className="text-muted-foreground">
                You can request multiple video variants in a single job:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>For <strong>1080p resolutions</strong>: variants feature is <strong>disabled</strong></li>
                <li>For <strong>720p</strong>: maximum is <strong>2 variants</strong></li>
                <li>For <strong>other resolutions</strong>: maximum is <strong>4 variants</strong></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">Concurrent Jobs</h3>
              <p className="text-muted-foreground">
                You can have <strong>two video creation jobs</strong> running at the same time. You must wait for one of the jobs to finish before you can create another.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">Job Availability</h3>
              <p className="text-muted-foreground">
                Jobs are available for up to <strong>24 hours</strong> after they're created. After that, you must create a new job to generate the video again.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">Input Options</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>You can use up to <strong>two images</strong> as input (the generated video interpolates content between them)</li>
                <li>You can use <strong>one video up to five seconds</strong> as input</li>
              </ul>
            </div>

            <div className="rounded-lg bg-muted p-4 mt-4">
              <p className="text-sm font-medium">💡 Best Practices</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-2">
                <li>Use 720p for faster generation with variant support</li>
                <li>Keep prompts clear and descriptive for best results</li>
                <li>Download videos promptly as they expire after 24 hours</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

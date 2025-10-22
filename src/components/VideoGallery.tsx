import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Sparkles } from "lucide-react";
import { VideoMetadata } from "@/lib/appwriteStorage";

interface VideoGalleryProps {
  videos: VideoMetadata[];
  onDelete: (id: string) => void;
}

export default function VideoGallery({ videos, onDelete }: VideoGalleryProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Videos</h2>
      {videos.length === 0 ? (
        <Card className="glass border-primary/20">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No videos yet. Generate your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {videos.map((video) => (
            <Card key={video.id} className="glass border-primary/20 overflow-hidden">
              <CardContent className="p-0">
                <video
                  src={video.url}
                  controls
                  className="w-full aspect-video bg-black"
                />
                <div className="p-4 space-y-2">
                  <p className="text-sm line-clamp-2">{video.prompt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(video.timestamp).toLocaleDateString()}</span>
                    <span>{video.width}x{video.height} • {video.duration}s</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(video.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

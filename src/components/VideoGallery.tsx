import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Sparkles, Download, Copy } from "lucide-react";
import { VideoMetadata } from "@/lib/appwriteStorage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface VideoGalleryProps {
  videos: VideoMetadata[];
  onDelete: (id: string) => void;
  directVideoUrl?: string | null;
}

export default function VideoGallery({ videos, onDelete, directVideoUrl }: VideoGalleryProps) {
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const downloadWithApiKey = async (url: string) => {
    try {
      const stored = localStorage.getItem("lemongrab_settings");
      if (!stored) {
        toast.error("Please configure Azure settings first");
        return;
      }
      const { apiKey } = JSON.parse(stored || '{}');
      if (!apiKey) {
        toast.error("Missing API key in Settings");
        return;
      }

      const res = await fetch(url, { headers: { 'api-key': apiKey } });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `video_${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      toast.success("Download started");
    } catch (e: any) {
      toast.error(e?.message || "Download failed");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Videos</h2>
      
      {/* Direct Video URL Card */}
      {directVideoUrl && (
        <Card className="glass glow border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Video Ready - Direct Download</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Your video is ready! Download it directly from Azure or save it to your library.
                </p>
                <div className="bg-background/50 rounded p-2 mb-3 break-all text-xs font-mono">
                  {directVideoUrl}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => downloadWithApiKey(directVideoUrl)}
                    className="flex-1"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(directVideoUrl)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy URL
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {videos.length === 0 && !directVideoUrl ? (
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
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm line-clamp-2 flex-1">{video.prompt}</p>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {video.soraVersion || 'sora-1'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(video.id);
                        toast.success("Video ID copied to clipboard");
                      }}
                      className="text-xs h-7 px-2"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      ID: {video.id.slice(0, 8)}...
                    </Button>
                  </div>
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

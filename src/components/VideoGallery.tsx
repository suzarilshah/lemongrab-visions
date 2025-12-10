import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Sparkles, Download, Copy, Play, ExternalLink, Film, Loader2 } from "lucide-react";
import { VideoMetadata } from "@/lib/videoStorage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { getActiveProfile } from "@/lib/profiles";

interface VideoGalleryProps {
  videos: VideoMetadata[];
  onDelete: (id: string) => void;
  directVideoUrl?: string | null;
}

// Video preview component that handles authenticated loading
function AuthenticatedVideoPreview({ url, onPlay, onPause }: { url: string; onPlay?: () => void; onPause?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    const loadVideo = async () => {
      // If URL is already a blob URL or data URL, use it directly
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        setBlobUrl(url);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        const profile = await getActiveProfile();
        const headers: HeadersInit = {};

        // Add API key if available and URL looks like an Azure URL
        if (profile?.apiKey && (url.includes('azure') || url.includes('openai'))) {
          headers['api-key'] = profile.apiKey;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(`Failed to load video: ${response.status}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (mounted) {
          setBlobUrl(objectUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load video preview:', err);
        if (mounted) {
          setError(true);
          setLoading(false);
          // Fallback: try loading directly (might work for non-Azure URLs)
          setBlobUrl(url);
        }
      }
    };

    loadVideo();

    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  const handleMouseEnter = () => {
    if (videoRef.current && blobUrl) {
      videoRef.current.play().catch(() => {});
      onPlay?.();
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      onPause?.();
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/50">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={blobUrl || undefined}
      className="w-full h-full object-cover"
      preload="metadata"
      muted
      playsInline
      loop
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onLoadedData={(e) => {
        // Seek to first frame to show thumbnail
        const video = e.currentTarget;
        if (video.currentTime === 0) {
          video.currentTime = 0.1;
        }
      }}
      onError={() => setError(true)}
    />
  );
}

export default function VideoGallery({ videos, onDelete, directVideoUrl }: VideoGalleryProps) {
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const downloadWithApiKey = async (url: string) => {
    try {
      const { getActiveProfile } = await import("@/lib/profiles");
      const profile = await getActiveProfile();
      
      if (!profile) {
        toast.error("Please configure your Azure settings first");
        return;
      }
      
      if (!profile.apiKey) {
        toast.error("Missing API key in profile settings");
        return;
      }

      const res = await fetch(url, { headers: { 'api-key': profile.apiKey } });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `octo_${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      toast.success("Download started");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Download failed";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Film className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Recent Videos</h2>
          <p className="text-sm text-muted-foreground">Your latest generated videos</p>
        </div>
      </div>
      
      {/* Direct Video URL Banner */}
      {directVideoUrl && (
        <div className="card-premium rounded-xl p-5 border-primary/30 bg-primary/5 shimmer">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h3 className="font-semibold">Video Ready!</h3>
                <p className="text-sm text-muted-foreground">
                  Your video is ready. Download it directly or copy the URL.
                </p>
              </div>
              <div className="bg-background/50 rounded-lg p-3 break-all text-xs font-mono text-muted-foreground">
                {directVideoUrl.slice(0, 80)}...
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => downloadWithApiKey(directVideoUrl)}
                  className="btn-premium"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(directVideoUrl)}
                  className="hover:bg-primary/10"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(directVideoUrl, '_blank')}
                  className="hover:bg-primary/10"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {videos.length === 0 && !directVideoUrl && (
        <div className="card-premium rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">No videos yet</h3>
          <p className="text-sm text-muted-foreground">
            Generate your first video using the form above
          </p>
        </div>
      )}

      {/* Video Grid */}
      {videos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video, index) => (
            <div 
              key={video.id} 
              className="card-premium rounded-xl overflow-hidden group animate-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Video Preview */}
              <div className="relative aspect-video bg-black/50">
                <AuthenticatedVideoPreview url={video.url} />
                
                {/* Play Indicator */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="p-3 rounded-full bg-white/10 backdrop-blur-sm">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                {/* Model Badge */}
                <div className="absolute top-2 left-2">
                  <Badge 
                    className={`text-xs ${
                      video.soraVersion === "sora-2" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-white/10 backdrop-blur-sm text-white border-0"
                    }`}
                  >
                    {video.soraVersion === "sora-2" ? "Sora 2" : "Sora 1"}
                  </Badge>
                </div>
                
                {/* Duration Badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-xs text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                    {video.duration}s
                  </span>
                </div>
              </div>
              
              {/* Video Info */}
              <div className="p-4 space-y-3">
                <p className="text-sm line-clamp-2 leading-relaxed">{video.prompt}</p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(video.timestamp).toLocaleDateString()}</span>
                  <span>{video.width}×{video.height}</span>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const vid = video.azureVideoId || video.id;
                      const fullId = vid?.startsWith("video_") ? vid : `video_${vid}`;
                      navigator.clipboard.writeText(fullId);
                      toast.success("Video ID copied");
                    }}
                    className="flex-1 h-8 text-xs hover:bg-primary/10"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy ID
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(video.id)}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

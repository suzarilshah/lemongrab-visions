import { useState, useEffect, useRef } from "react";
import { getCurrentUser, User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Download, Copy, Play, Pause, Film, Sparkles, Scissors, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { listVideosFromStorage, deleteVideoMetadata, VideoMetadata } from "@/lib/videoStorage";
import { toast } from "sonner";
import { getActiveProfile } from "@/lib/profiles";
import { cn } from "@/lib/utils";

// Video card component with authenticated loading and hover effects
function VideoCard({
  video,
  index,
  onDelete,
  onDownload
}: {
  video: VideoMetadata;
  index: number;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load video with authentication for Azure URLs
  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    const loadVideo = async () => {
      // If URL is already a blob URL or data URL, use it directly
      if (video.url.startsWith('blob:') || video.url.startsWith('data:')) {
        setBlobUrl(video.url);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const profile = await getActiveProfile();
        const headers: HeadersInit = {};

        // Add API key if available and URL looks like an Azure URL
        if (profile?.apiKey && (video.url.includes('azure') || video.url.includes('openai'))) {
          headers['api-key'] = profile.apiKey;
        }

        const response = await fetch(video.url, { headers });

        if (!response.ok) {
          throw new Error(`Failed to load video: ${response.status}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (mounted) {
          setBlobUrl(objectUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load video preview:', err);
        if (mounted) {
          setIsLoading(false);
          // Fallback: try loading directly
          setBlobUrl(video.url);
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
  }, [video.url]);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current && blobUrl) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  return (
    <div
      className="card-premium rounded-xl overflow-hidden group animate-in"
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Player */}
      <div className="relative aspect-video bg-black/50">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          blobUrl && (
            <video
              ref={videoRef}
              src={blobUrl}
              className="w-full h-full object-cover"
              muted
              playsInline
              loop
              preload="metadata"
              onLoadedData={(e) => {
                // Seek to first frame to show thumbnail
                const vid = e.currentTarget;
                if (vid.currentTime === 0 && !isPlaying) {
                  vid.currentTime = 0.1;
                }
              }}
            />
          )
        )}

        {/* Play/Pause Overlay */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity cursor-pointer",
            isHovering ? "opacity-100" : "opacity-0"
          )}
          onClick={togglePlay}
        >
          <div className="p-4 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
            {isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 text-white" />
            )}
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <Badge
            className={`${
              video.soraVersion === "sora-2"
                ? "bg-primary text-primary-foreground"
                : "bg-white/10 backdrop-blur-sm text-white"
            }`}
          >
            {video.soraVersion === "sora-2" ? "Sora 2" : "Sora 1"}
          </Badge>
          <span className="text-xs text-white/80 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
            {video.duration}s
          </span>
        </div>
      </div>

      {/* Video Info */}
      <div className="p-4 space-y-3">
        <p className="text-sm line-clamp-2 leading-relaxed">
          {video.prompt}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(video.timestamp).toLocaleDateString()}</span>
          <span>{video.width}×{video.height}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const vid = video.azureVideoId || video.id;
              const fullId = vid?.startsWith("video_") ? vid : `video_${vid}`;
              navigator.clipboard.writeText(fullId);
              toast.success("Video ID copied");
            }}
            className="flex-1 h-9 text-xs hover:bg-primary/10"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy ID
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="flex-1 h-9 text-xs hover:bg-primary/10"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Gallery() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate("/login");
        return;
      }
      setUser(currentUser);
      await loadVideos();
    } catch {
      navigate("/login");
    }
  };

  const loadVideos = async () => {
    try {
      setIsLoading(true);
      const videoList = await listVideosFromStorage();
      setVideos(videoList);
    } catch {
      toast.error("Failed to load videos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideoMetadata(id);
      setVideos(videos.filter((v) => v.id !== id));
      toast.success("Video deleted successfully");
    } catch {
      toast.error("Failed to delete video");
    }
  };

  const downloadVideo = async (url: string) => {
    try {
      // Use authenticated fetch for Azure URLs
      const profile = await getActiveProfile();
      const headers: HeadersInit = {};

      if (profile?.apiKey && (url.includes('azure') || url.includes('openai'))) {
        headers['api-key'] = profile.apiKey;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Download failed (${res.status})`);
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
    <div className="min-h-screen bg-background relative">
      {/* Background */}
      <div className="fixed inset-0 bg-mesh opacity-50" />
      <div className="fixed inset-0 bg-grid opacity-30" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="hover:bg-primary/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="h-6 w-px bg-border/50" />
              <div className="flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Video Gallery</h1>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/video-editor")}
                  className="hover:bg-primary/10"
                >
                  <Scissors className="mr-2 h-4 w-4" />
                  Edit Videos
                </Button>
                <span className="text-sm text-muted-foreground">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading your videos...</p>
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="card-premium rounded-2xl p-12 text-center max-w-md animate-in">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No videos yet</h2>
              <p className="text-muted-foreground mb-6">
                Start creating amazing AI-generated videos with just a text prompt.
              </p>
              <Button
                onClick={() => navigate("/")}
                className="btn-premium"
              >
                Create your first video
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, index) => (
              <VideoCard
                key={video.id}
                video={video}
                index={index}
                onDelete={() => handleDelete(video.id)}
                onDownload={() => downloadVideo(video.url)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

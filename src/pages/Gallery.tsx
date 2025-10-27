import { useState, useEffect } from "react";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2, Download, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.svg";
import { useNavigate } from "react-router-dom";
import { listVideosFromAppwrite, deleteVideoFromAppwrite, VideoMetadata } from "@/lib/appwriteStorage";
import { toast } from "sonner";

export default function Gallery() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
      await loadVideos();
    } catch (error) {
      navigate("/login");
    }
  };

  const loadVideos = async () => {
    try {
      setIsLoading(true);
      const videoList = await listVideosFromAppwrite();
      setVideos(videoList);
    } catch (error) {
      toast.error("Failed to load videos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideoFromAppwrite(id);
      setVideos(videos.filter((v) => v.id !== id));
      toast.success("Video deleted successfully");
    } catch (error) {
      toast.error("Failed to delete video");
    }
  };

  const downloadVideo = async (url: string) => {
    try {
      // For Appwrite-stored videos, download directly without API key
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Download failed (${res.status})`);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold">Video Gallery</h1>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <Card className="glass border-primary/20">
            <CardContent className="py-12 text-center">
              <img src={logo} alt="LemonGrab Logo" className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No videos saved yet. Generate your first one!</p>
              <Button
                className="mt-4"
                onClick={() => navigate("/")}
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <Card key={video.id} className="glass border-primary/20 overflow-hidden group hover:border-primary/40 transition-all">
                <CardContent className="p-0">
                    <div className="relative aspect-video bg-black">
                      <video
                        src={video.url}
                        className="w-full h-full object-cover"
                        poster={video.url}
                        preload="metadata"
                        muted
                        playsInline
                        loop
                        autoPlay
                      />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => downloadVideo(video.url)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(video.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={video.soraVersion === "sora-2" ? "default" : "secondary"} className="text-xs">
                        {video.soraVersion === "sora-2" ? "Sora 2" : "Sora 1"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const vid = (video as any).azureVideoId || video.id;
                          const fullId = vid?.startsWith("video_") ? vid : `video_${vid}`;
                          navigator.clipboard.writeText(fullId);
                          toast.success("Video ID copied to clipboard");
                        }}
                        className="text-xs h-6 px-2"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        ID: {(((video as any).azureVideoId || video.id) as string)}
                      </Button>
                    </div>
                    <p className="text-sm line-clamp-2">{video.prompt}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(video.timestamp).toLocaleDateString()}</span>
                      <span>{video.width}x{video.height} • {video.duration}s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

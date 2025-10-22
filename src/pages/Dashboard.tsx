import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, Settings, LogOut, Play, Trash2, Moon, Sun } from "lucide-react";
import { generateVideo, saveVideoToLocal, getLocalVideos, deleteLocalVideo } from "@/lib/videoGenerator";
import { useTheme } from "@/components/ThemeProvider";

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<Array<{ id: string; url: string; prompt: string; timestamp: string }>>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadVideos();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch (error) {
      navigate("/login");
    }
  };

  const loadVideos = () => {
    setVideos(getLocalVideos());
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      navigate("/login");
    } catch (error: any) {
      toast.error("Logout failed");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    const stored = localStorage.getItem("lemongrab_settings");
    if (!stored) {
      toast.error("Please configure your Azure settings first");
      navigate("/settings");
      return;
    }

    const settings = JSON.parse(stored);
    setIsGenerating(true);

    try {
      toast.info("Generating video... This may take 1-3 minutes");
      const videoUrl = await generateVideo({
        prompt,
        endpoint: settings.endpoint,
        apiKey: settings.apiKey,
        deployment: settings.deployment,
      });

      saveVideoToLocal(videoUrl, prompt);
      loadVideos();
      toast.success("Video generated successfully!");
      setPrompt("");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate video");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id: string) => {
    deleteLocalVideo(id);
    loadVideos();
    toast.success("Video deleted");
  };

  return (
    <div className="min-h-screen gradient-animate">
      {/* Header */}
      <header className="border-b border-primary/20 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                LemonGrab
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings")}
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Generator Card */}
          <Card className="glass glow border-primary/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-2xl">Generate Video with Sora-2</CardTitle>
              <CardDescription>
                Describe your video and let AI bring it to life with audio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="A train journey through mountains, with scenic views and dramatic lighting..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] glass border-primary/20 resize-none"
                disabled={isGenerating}
              />
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                <Play className="mr-2 h-5 w-5" />
                {isGenerating ? "Generating..." : "Generate Video"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Videos are generated at 720p resolution with up to 12 seconds duration
              </p>
            </CardContent>
          </Card>

          {/* Video Gallery */}
          <div className="lg:col-span-2 space-y-4">
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
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(video.timestamp).toLocaleDateString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(video.id)}
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
        </div>
      </main>
    </div>
  );
}

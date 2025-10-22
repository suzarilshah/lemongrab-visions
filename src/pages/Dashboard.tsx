import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Settings, LogOut, Moon, Sun, Images } from "lucide-react";
import { generateVideo } from "@/lib/videoGenerator";
import { 
  uploadVideoToAppwrite, 
  listVideosFromAppwrite, 
  deleteVideoFromAppwrite,
  saveVideoMetadata,
  VideoMetadata
} from "@/lib/appwriteStorage";
import { useTheme } from "@/components/ThemeProvider";
import VideoGenerationForm from "@/components/VideoGenerationForm";
import VideoGallery from "@/components/VideoGallery";
import ApiConsole from "@/components/ApiConsole";
import SoraLimitationsDialog from "@/components/SoraLimitationsDialog";
import Sora2FeaturesDialog from "@/components/Sora2FeaturesDialog";

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [user, setUser] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [directVideoUrl, setDirectVideoUrl] = useState<string | null>(null);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [soraVersion, setSoraVersion] = useState<string>("sora-1");

  useEffect(() => {
    checkAuth();
    loadVideos();
    loadSoraVersion();
  }, []);

  const loadSoraVersion = () => {
    const stored = localStorage.getItem("lemongrab_settings");
    if (stored) {
      const settings = JSON.parse(stored);
      setSoraVersion(settings.soraVersion || "sora-1");
    }
  };

  const checkAuth = async () => {
    try {
      console.log("[Dashboard] Checking authentication...");
      const currentUser = await account.get();
      console.log("[Dashboard] User authenticated:", currentUser.email);
      setUser(currentUser);
    } catch (error: any) {
      console.error("[Dashboard] Auth check failed:", {
        error,
        message: error?.message
      });
      
      if (error?.message === "Failed to fetch") {
        console.error("[Dashboard] CORS Error: Add", window.location.origin, "to Appwrite Console");
      }
      
      navigate("/login");
    }
  };

  const loadVideos = async () => {
    const videoList = await listVideosFromAppwrite();
    setVideos(videoList);
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      navigate("/login");
    } catch (error: any) {
      toast.error("Logout failed");
    }
  };

  const handleGenerate = async (params: {
    prompt: string;
    height: string;
    width: string;
    duration: number;
    variants: string;
    audio?: boolean;
    inputReference?: File;
    remixVideoId?: string;
  }) => {
    if (!params.prompt.trim()) {
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
    setProgress(10);
    setProgressMessage("Starting video generation...");

    try {
      const videoBlob = await generateVideo({
        prompt: params.prompt,
        height: params.height,
        width: params.width,
        duration: params.duration,
        variants: params.variants,
        endpoint: settings.endpoint,
        apiKey: settings.apiKey,
        deployment: settings.deployment,
        audio: params.audio,
        inputReference: params.inputReference,
        remixVideoId: params.remixVideoId,
          onProgress: (status: string) => {
            setProgressMessage(status);

            if (status.startsWith("log:")) {
              try {
                const payload = JSON.parse(status.slice(4));
                setApiLogs((prev) => [{ id: `${Date.now()}-${Math.random()}`, ...payload }, ...prev].slice(0, 500));
              } catch {}
              return;
            }

            if (status.startsWith("download_url:")) {
              const url = status.replace("download_url:", "").trim();
              setDirectVideoUrl(url);
              console.info("[VideoGen] Direct download URL:", url);
              toast.message("Video ready", {
                description: "Open the direct download link",
                action: { label: "Open", onClick: () => window.open(url, "_blank") },
              });
            }

            // Simulate progress increase based on status
            if (status.includes("created")) setProgress(20);
            if (status.includes("Initializing")) setProgress(30);
            if (status.includes("Preprocessing")) setProgress(40);
            if (status.includes("Generating")) setProgress(60);
            if (status.includes("Processing")) setProgress(80);
            if (status.includes("Downloading")) setProgress(90);
          },
      });

      setProgress(95);
      setProgressMessage("Uploading to storage...");

      const metadata = await uploadVideoToAppwrite(
        videoBlob,
        params.prompt,
        params.height,
        params.width,
        params.duration.toString(),
        soraVersion
      );

      saveVideoMetadata(metadata);
      await loadVideos();
      
      setProgress(100);
      toast.success("🎉 Video generated successfully!");
    } catch (error: any) {
      console.error("[Dashboard] Video generation error:", {
        error,
        message: error?.message,
        stack: error?.stack
      });
      
      // Check if it's a CORS-related error
      if (error?.message?.includes("CORS") || error?.message === "Failed to fetch") {
        toast.error("Connection Error", {
          description: "Cannot connect to Appwrite. Check console for CORS setup instructions.",
          duration: 10000
        });
      } else {
        toast.error(error.message || "Failed to generate video");
      }
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setProgressMessage("");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideoFromAppwrite(id);
      await loadVideos();
      toast.success("Video deleted");
    } catch (error: any) {
      toast.error("Failed to delete video");
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                LemonGrab
              </h1>
              {soraVersion === "sora-1" ? (
                <SoraLimitationsDialog />
              ) : (
                <Sora2FeaturesDialog />
              )}
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
                onClick={() => navigate("/gallery")}
                title="Gallery"
              >
                <Images className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings")}
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 w-full max-w-full overflow-hidden">
          {/* Generator Form */}
          <VideoGenerationForm
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            progress={progress}
            progressMessage={progressMessage}
          />

          {/* Video Gallery */}
          <VideoGallery videos={videos} onDelete={handleDelete} directVideoUrl={directVideoUrl} />

          {/* API Console */}
          <ApiConsole logs={apiLogs} onClear={() => setApiLogs([])} />
        </div>
      </main>
    </div>
  );
}

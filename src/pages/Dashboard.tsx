import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, LogOut, Moon, Sun, Images, DollarSign } from "lucide-react";
import logo from "@/assets/logo.svg";
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
import CostTracking from "@/components/CostTracking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveGenerationRecord, calculateCost } from "@/lib/costTracking";
import { getActiveProfile } from "@/lib/profiles";

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
  const [activeProfileName, setActiveProfileName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("generate");

  useEffect(() => {
    checkAuth();
    loadVideos();
    loadActiveProfile();
  }, []);

  const loadActiveProfile = () => {
    const profile = getActiveProfile();
    if (profile) {
      setSoraVersion(profile.soraVersion || "sora-1");
      setActiveProfileName(profile.name);
      return;
    }
    const stored = localStorage.getItem("lemongrab_settings");
    if (stored) {
      const settings = JSON.parse(stored);
      setSoraVersion(settings.soraVersion || "sora-1");
      setActiveProfileName("Default");
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
    // Fetch only the latest 6 videos
    const videoList = await listVideosFromAppwrite(6);
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

    // Resolve settings from active profile or legacy settings
    const profile = getActiveProfile();
    let settings: any = null;
    if (profile) {
      settings = {
        endpoint: profile.endpoint,
        apiKey: profile.apiKey,
        deployment: profile.deployment,
        soraVersion: profile.soraVersion,
      };
    } else {
      const stored = localStorage.getItem("lemongrab_settings");
      if (!stored) {
        toast.error("Please configure your Azure settings first");
        navigate("/settings");
        return;
      }
      settings = JSON.parse(stored);
    }
    setIsGenerating(true);
    setProgress(10);
    setProgressMessage("Starting video generation...");

    try {
      const result = await generateVideo({
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
        result.blob,
        params.prompt,
        params.height,
        params.width,
        params.duration.toString(),
        soraVersion,
        // Ensure full video_ prefix is present
        result.videoId?.startsWith("video_") ? result.videoId : result.videoId ? `video_${result.videoId}` : undefined
      );

      saveVideoMetadata(metadata);
      await loadVideos();

      // Determine generation mode
      let generationMode = "text-to-video";
      if (params.inputReference) {
        generationMode = "image-to-video";
      } else if (params.remixVideoId) {
        generationMode = "video-to-video";
      }

      // Calculate and save cost tracking
      const estimatedCost = calculateCost(
        params.width,
        params.height,
        params.duration.toString(),
        params.variants,
        settings.soraVersion || soraVersion
      );

      await saveGenerationRecord({
        prompt: params.prompt,
        soraModel: settings.soraVersion || soraVersion,
        duration: params.duration,
        resolution: `${params.width}x${params.height}`,
        variants: parseInt(params.variants),
        generationMode,
        estimatedCost,
        videoId: result.videoId?.startsWith("video_") ? result.videoId : result.videoId ? `video_${result.videoId}` : undefined,
        profileName: activeProfileName || (getActiveProfile()?.name || "Default"),
      });
      
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
              <img src={logo} alt="LemonGrab Logo" className="h-10 w-10" />
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="glass border-primary/20 mb-6">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="cost-tracking">
              <DollarSign className="h-4 w-4 mr-2" />
              Cost Tracking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="cost-tracking">
            <CostTracking />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

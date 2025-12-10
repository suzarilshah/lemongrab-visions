import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, deleteSession, User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, LogOut, Moon, Sun, Images, DollarSign, List, X, PlayCircle, Sparkles, Zap, Scissors, Film } from "lucide-react";
import logo from "@/assets/logo.svg";
import { generateVideo } from "@/lib/videoGenerator";
import { 
  listVideosFromStorage, 
  deleteVideoMetadata,
  saveVideoMetadata,
  VideoMetadata
} from "@/lib/videoStorage";
import { useTheme } from "@/components/ThemeProvider";
import VideoGenerationForm from "@/components/VideoGenerationForm";
import VideoGallery from "@/components/VideoGallery";
import ApiConsole from "@/components/ApiConsole";
import SoraLimitationsDialog from "@/components/SoraLimitationsDialog";
import Sora2FeaturesDialog from "@/components/Sora2FeaturesDialog";
import CostTracking from "@/components/CostTracking";
import Generations from "@/components/Generations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveGenerationRecord, calculateCost, upsertGenerationRecord, updateGenerationStatus, fetchActiveGeneration } from "@/lib/costTracking";
import { getActiveProfile } from "@/lib/profiles";

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [directVideoUrl, setDirectVideoUrl] = useState<string | null>(null);
  const [apiLogs, setApiLogs] = useState<{ id: string; [key: string]: unknown }[]>([]);
  const [soraVersion, setSoraVersion] = useState<string>("sora-1");
  const [activeProfileName, setActiveProfileName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("generate");
  const [activeGeneration, setActiveGeneration] = useState<{ jobId?: string; status?: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    checkAuth();
    loadVideos();
    loadActiveProfile();
    restoreActiveGeneration();
  }, []);

  const restoreActiveGeneration = async () => {
    const active = await fetchActiveGeneration();
    if (active) {
      setActiveGeneration(active);
      setCurrentJobId(active.jobId || null);
      toast.info("Active generation found", {
        description: "You have a video generation in progress",
      });
    }
  };

  const loadActiveProfile = async () => {
    const profile = await getActiveProfile();
    if (profile) {
      setSoraVersion(profile.soraVersion || "sora-1");
      setActiveProfileName(profile.name);
    }
  };

  const checkAuth = async () => {
    try {
      console.log("[Dashboard] Checking authentication...");
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.log("[Dashboard] No user found, redirecting to login");
        navigate("/login");
        return;
      }
      console.log("[Dashboard] User authenticated:", currentUser.email);
      setUser(currentUser);
    } catch (error: unknown) {
      console.error("[Dashboard] Auth check failed:", error);
      navigate("/login");
    }
  };

  const loadVideos = async () => {
    try {
      const videoList = await listVideosFromStorage(6);
      setVideos(videoList);
    } catch (error) {
      console.error('[Dashboard] Failed to load videos:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await deleteSession();
      navigate("/login");
    } catch {
      toast.error("Logout failed");
    }
  };

  const handleCancelJob = async () => {
    if (!currentJobId) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (activeGeneration) {
      try {
        const activeProfile = await getActiveProfile();
        
        if (activeProfile?.endpoint && activeProfile?.apiKey) {
          const { cancelVideoJob } = await import('@/lib/videoGenerator');
          await cancelVideoJob(
            currentJobId,
            activeProfile.endpoint,
            activeProfile.apiKey,
            activeProfile.soraVersion
          );
        }
      } catch (error) {
        console.error('[Dashboard] Error canceling with Azure:', error);
      }
    }

    await updateGenerationStatus(currentJobId, 'canceled');
    
    setIsGenerating(false);
    setProgress(0);
    setProgressMessage("");
    setActiveGeneration(null);
    setCurrentJobId(null);
    
    toast.success("Generation canceled");
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

    const profile = await getActiveProfile();
    if (!profile) {
      toast.error("Please configure your Azure settings first");
      navigate("/settings");
      return;
    }
    
    const settings = {
      endpoint: profile.endpoint,
      apiKey: profile.apiKey,
      deployment: profile.deployment,
      soraVersion: profile.soraVersion,
    };
    setIsGenerating(true);
    setProgress(10);
    setProgressMessage("Starting video generation...");

    let generationMode = "text-to-video";
    if (params.inputReference) {
      generationMode = "image-to-video";
    } else if (params.remixVideoId) {
      generationMode = "video-to-video";
    }

    const estimatedCost = calculateCost(
      params.width,
      params.height,
      params.duration.toString(),
      params.variants,
      settings.soraVersion || soraVersion
    );

    abortControllerRef.current = new AbortController();
    let jobId: string | null = null;

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
              
              if (payload.message === 'Job created' && payload.jobId && !jobId) {
                jobId = payload.jobId;
                setCurrentJobId(jobId);
                
                void upsertGenerationRecord({
                  jobId,
                  prompt: params.prompt,
                  soraModel: settings.soraVersion || soraVersion,
                  duration: params.duration,
                  resolution: `${params.width}x${params.height}`,
                  variants: parseInt(params.variants),
                  generationMode,
                  estimatedCost,
                  profileName: activeProfileName || "Default",
                  status: 'running',
                });
              }
            } catch {
              // Ignore parse errors
            }
            return;
          }

          if (status.startsWith("download_url:")) {
            const url = status.replace("download_url:", "").trim();
            setDirectVideoUrl(url);
            toast.message("Video ready", {
              description: "Open the direct download link",
              action: { label: "Open", onClick: () => window.open(url, "_blank") },
            });
          }

          if (status.includes("created")) setProgress(20);
          if (status.includes("Initializing")) setProgress(30);
          if (status.includes("Preprocessing")) setProgress(40);
          if (status.includes("Generating")) {
            setProgress(60);
            if (jobId) void updateGenerationStatus(jobId, 'running');
          }
          if (status.includes("Processing")) setProgress(80);
          if (status.includes("Downloading")) setProgress(90);
        },
      }, abortControllerRef.current);

      setProgress(95);
      setProgressMessage("Saving to library...");

      const videoIdFinal = result.videoId?.startsWith("video_") ? result.videoId : result.videoId ? `video_${result.videoId}` : undefined;

      try {
        await saveVideoMetadata({
          url: result.downloadUrl || '',
          prompt: params.prompt,
          height: params.height,
          width: params.width,
          duration: String(params.duration),
          soraVersion: settings.soraVersion || soraVersion,
          azureVideoId: videoIdFinal,
        });

        toast.success("Video saved to your library");
        
        if (jobId) {
          await updateGenerationStatus(jobId, 'completed', videoIdFinal);
        }
        
        await loadVideos();
      } catch (uploadError: unknown) {
        console.error("[Dashboard] Video metadata save error:", uploadError);
        const message = uploadError instanceof Error ? uploadError.message : "Failed to save video to library";
        toast.error(message);
        
        if (!jobId) {
          await saveGenerationRecord({
            prompt: params.prompt,
            soraModel: settings.soraVersion || soraVersion,
            duration: params.duration,
            resolution: `${params.width}x${params.height}`,
            variants: parseInt(params.variants),
            generationMode,
            estimatedCost,
            videoId: null,
            profileName: activeProfileName || 'default',
          });
        }
      }

      if (!jobId) {
        await saveGenerationRecord({
          prompt: params.prompt,
          soraModel: settings.soraVersion || soraVersion,
          duration: params.duration,
          resolution: `${params.width}x${params.height}`,
          variants: parseInt(params.variants),
          generationMode,
          estimatedCost,
          videoId: videoIdFinal,
          profileName: activeProfileName || "Default",
          status: 'completed',
        });
      }
      
      setProgress(100);
      setActiveGeneration(null);
      setCurrentJobId(null);
      toast.success("🎉 Video generated successfully!");
    } catch (error: unknown) {
      console.error("[Dashboard] Video generation error:", error);
      
      if (jobId) {
        await updateGenerationStatus(jobId, 'failed');
      }
      
      const errorMessage = error instanceof Error ? error.message : "Failed to generate video";
      
      if (errorMessage.includes("CORS") || errorMessage === "Failed to fetch") {
        toast.error("Connection Error", {
          description: "Cannot connect to the server. Please check your network.",
          duration: 10000
        });
      } else if (error instanceof Error && error.name === 'AbortError') {
        toast.info("Generation canceled by user");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setProgressMessage("");
      setActiveGeneration(null);
      setCurrentJobId(null);
      abortControllerRef.current = null;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideoMetadata(id);
      await loadVideos();
      toast.success("Video deleted");
    } catch {
      toast.error("Failed to delete video");
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
              <div className="flex items-center gap-3">
                <img src={logo} alt="Octo" className="h-9 w-9" />
                <h1 className="text-xl font-bold text-gradient hidden sm:block">
                  Octo
                </h1>
              </div>
              
              {/* Model indicator */}
              <div className="hidden md:flex items-center gap-2">
                {soraVersion === "sora-1" ? (
                  <SoraLimitationsDialog />
                ) : (
                  <Sora2FeaturesDialog />
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover:bg-primary/10"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/movie-studio")}
                className="hover:bg-primary/10"
                title="Movie Studio"
              >
                <Film className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/video-editor")}
                className="hover:bg-primary/10"
                title="Video Editor"
              >
                <Scissors className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/gallery")}
                className="hover:bg-primary/10"
                title="Gallery"
              >
                <Images className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings")}
                className="hover:bg-primary/10"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="hover:bg-destructive/10 hover:text-destructive"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Custom Tab Navigation */}
          <div className="flex items-center justify-between mb-8">
            <TabsList className="bg-card/50 backdrop-blur-sm border border-border/50 p-1 rounded-xl">
              <TabsTrigger 
                value="generate"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2 font-medium transition-all"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </TabsTrigger>
              <TabsTrigger 
                value="generations"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2 font-medium transition-all"
              >
                <List className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger 
                value="cost-tracking"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2 font-medium transition-all"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Costs
              </TabsTrigger>
            </TabsList>
            
            {/* User info */}
            {user && (
              <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>{user.email}</span>
              </div>
            )}
          </div>

          <TabsContent value="generate" className="space-y-8 animate-in">
            {/* Active Generation Banner */}
            {activeGeneration && !isGenerating && (
              <div className="card-premium rounded-xl p-4 border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <PlayCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Active generation in progress</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Job ID: {activeGeneration.jobId || "N/A"} • Status: {activeGeneration.status || "unknown"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelJob}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
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

          <TabsContent value="generations" className="animate-in">
            <Generations />
          </TabsContent>

          <TabsContent value="cost-tracking" className="animate-in">
            <CostTracking />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

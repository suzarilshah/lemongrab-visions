/**
 * Movie Studio - Text-to-Movie Generation Interface
 * Premium $100B Design
 *
 * Features:
 * - Script input with AI suggestions
 * - Real-time scene preview
 * - Progress tracking with WebSocket updates
 * - Storyboard view
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { getCurrentUser, User } from "@/lib/auth";
import logo from "@/assets/logo.svg";
import {
  ArrowLeft,
  Film,
  Sparkles,
  Wand2,
  Play,
  Pause,
  SkipForward,
  Download,
  Settings,
  Volume2,
  VolumeX,
  Layers,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Eye,
  RefreshCw,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { sql } from "@/lib/db";

// Types
interface Scene {
  scene_number: number;
  title: string;
  duration: number;
  visual_prompt: string;
  camera_movement: string;
  shot_type: string;
  voiceover_text: string | null;
  voice_style: string;
  transition: string;
  status: "pending" | "generating" | "completed" | "failed";
  video_url?: string;
  progress?: number;
}

interface MovieProject {
  id: string;
  title: string;
  script: string;
  status: string;
  total_scenes: number;
  completed_scenes: number;
  scenes: Scene[];
  final_video_url?: string;
}

// Style presets
const stylePresets = [
  { id: "cinematic", name: "Cinematic", description: "Film-quality dramatic visuals" },
  { id: "documentary", name: "Documentary", description: "Realistic, informative style" },
  { id: "animated", name: "Animated", description: "Stylized, artistic animation" },
  { id: "commercial", name: "Commercial", description: "Clean, professional ads" },
  { id: "music-video", name: "Music Video", description: "Dynamic, rhythmic editing" },
];

const moodPresets = [
  "dramatic", "peaceful", "exciting", "mysterious", "uplifting", "melancholic", "energetic"
];

const voiceOptions = [
  { id: "en-US-JennyNeural", name: "Jenny (Female)", style: "Friendly" },
  { id: "en-US-GuyNeural", name: "Guy (Male)", style: "Conversational" },
  { id: "en-US-AriaNeural", name: "Aria (Female)", style: "Professional" },
  { id: "en-US-DavisNeural", name: "Davis (Male)", style: "Professional" },
  { id: "en-US-SaraNeural", name: "Sara (Female)", style: "Cheerful" },
];

export default function MovieStudio() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [mood, setMood] = useState("dramatic");
  const [targetScenes, setTargetScenes] = useState(5);
  const [includeVoiceover, setIncludeVoiceover] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState("en-US-JennyNeural");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProject, setCurrentProject] = useState<MovieProject | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [activeTab, setActiveTab] = useState("script");

  // Preview state
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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
    } catch {
      navigate("/login");
    }
  };

  const handleGenerateMovie = async () => {
    if (!title.trim()) {
      toast.error("Please enter a movie title");
      return;
    }
    if (!script.trim()) {
      toast.error("Please enter your script or story concept");
      return;
    }

    setIsGenerating(true);
    setCurrentStep("Creating project...");
    setOverallProgress(5);

    try {
      // 1. Create movie project in database
      // Use a proper UUID for user_id - if user has non-UUID id (migrated from Appwrite), generate a new UUID
      const isValidUUID = user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      const userId = isValidUUID ? user.id : crypto.randomUUID();

      const projectResult = await sql`
        INSERT INTO movie_projects (user_id, title, script, style_preferences, status, total_scenes)
        VALUES (
          ${userId}::uuid,
          ${title},
          ${script},
          ${JSON.stringify({ style, mood, voice: selectedVoice, includeVoiceover })},
          'processing',
          ${targetScenes}
        )
        RETURNING id
      `;

      const projectId = projectResult[0].id;
      setOverallProgress(10);
      setCurrentStep("Sending to n8n workflow...");

      // 2. Trigger n8n workflow
      const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://n8n.suzarilshah.cf/webhook";

      const response = await fetch(`${n8nWebhookUrl}/movie/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movie_id: projectId,
          script,
          style_preferences: {
            style,
            mood,
            voice: selectedVoice,
            includeVoiceover,
          },
          target_scenes: targetScenes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start movie generation");
      }

      const result = await response.json();
      toast.success("Movie generation started!", {
        description: `Job ID: ${result.job_id || projectId}`,
      });

      setOverallProgress(15);
      setCurrentStep("AI is analyzing your script...");
      setActiveTab("storyboard");

      // 3. Start polling for updates
      pollForUpdates(projectId);

    } catch (error) {
      console.error("Movie generation error:", error);
      toast.error("Failed to start movie generation");
      setIsGenerating(false);
    }
  };

  const pollForUpdates = async (projectId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        // Fetch project status
        const projectResult = await sql`
          SELECT * FROM movie_projects WHERE id = ${projectId}
        `;

        if (projectResult.length === 0) {
          clearInterval(pollInterval);
          return;
        }

        const project = projectResult[0];

        // Fetch scenes
        const scenesResult = await sql`
          SELECT * FROM movie_scenes WHERE movie_id = ${projectId} ORDER BY scene_number
        `;

        const fetchedScenes: Scene[] = scenesResult.map((s) => ({
          scene_number: s.scene_number,
          title: s.title || `Scene ${s.scene_number}`,
          duration: s.duration || 10,
          visual_prompt: s.visual_prompt || "",
          camera_movement: s.camera_movement || "static",
          shot_type: s.shot_type || "medium",
          voiceover_text: s.voiceover_text,
          voice_style: "friendly",
          transition: s.transition || "cut",
          status: s.status as Scene["status"],
          video_url: s.video_url,
        }));

        setScenes(fetchedScenes);

        // Calculate progress
        const completedScenes = fetchedScenes.filter((s) => s.status === "completed").length;
        const totalScenes = project.total_scenes || targetScenes;
        const progress = 15 + (completedScenes / totalScenes) * 80;
        setOverallProgress(Math.min(progress, 95));

        // Update current step
        const generatingScene = fetchedScenes.find((s) => s.status === "generating");
        if (generatingScene) {
          setCurrentStep(`Generating Scene ${generatingScene.scene_number}: ${generatingScene.title}`);
        } else if (completedScenes === totalScenes && project.status !== "completed") {
          setCurrentStep("Assembling final video...");
        }

        // Check if complete
        if (project.status === "completed") {
          clearInterval(pollInterval);
          setOverallProgress(100);
          setCurrentStep("Movie completed!");
          setIsGenerating(false);
          setCurrentProject({
            id: project.id,
            title: project.title,
            script: project.script,
            status: project.status,
            total_scenes: project.total_scenes,
            completed_scenes: project.completed_scenes,
            scenes: fetchedScenes,
            final_video_url: project.final_video_url,
          });
          toast.success("Your movie is ready!", {
            description: "Click to preview and download",
            action: {
              label: "Watch",
              onClick: () => setActiveTab("preview"),
            },
          });
        } else if (project.status === "failed") {
          clearInterval(pollInterval);
          setIsGenerating(false);
          toast.error("Movie generation failed");
        }

      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000); // Poll every 3 seconds

    // Clear interval after 15 minutes max
    setTimeout(() => clearInterval(pollInterval), 15 * 60 * 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-mesh opacity-50" />
        <div className="absolute inset-0 bg-grid opacity-20" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="hover:bg-primary/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img src={logo} alt="Octo" className="h-8 w-8" />
                <div>
                  <h1 className="text-lg font-bold">Movie Studio</h1>
                  <p className="text-xs text-muted-foreground">Text-to-Movie Generation</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/5">
                <Sparkles className="h-3 w-3 mr-1 text-primary" />
                Sora 2 + GPT-4o
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-card/50 backdrop-blur-sm border border-border/50 p-1 rounded-xl mb-8">
            <TabsTrigger value="script" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6">
              <Wand2 className="h-4 w-4 mr-2" />
              Script
            </TabsTrigger>
            <TabsTrigger value="storyboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6">
              <Layers className="h-4 w-4 mr-2" />
              Storyboard
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6">
              <Play className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Script Tab */}
          <TabsContent value="script" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Script Input */}
              <div className="lg:col-span-2 space-y-6">
                <div className="card-premium p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-lg font-semibold">Movie Title</Label>
                    <Badge variant="outline">Required</Badge>
                  </div>
                  <Input
                    placeholder="Enter your movie title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-premium text-lg h-12"
                  />
                </div>

                <div className="card-premium p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-lg font-semibold">Script / Story Concept</Label>
                    <span className="text-sm text-muted-foreground">{script.length} characters</span>
                  </div>
                  <Textarea
                    placeholder="Enter your script, story outline, or concept. The AI will automatically break it down into scenes with camera directions, voiceover scripts, and transitions.

Example:
'A serene morning in a small coastal town. The camera pans across fishing boats gently rocking in the harbor. An elderly fisherman prepares his nets as the golden sun rises over the mountains. He reflects on decades of life at sea...'"
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    className="input-premium min-h-[300px] text-base leading-relaxed resize-none"
                  />
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                      AI will generate {targetScenes} scenes from your script
                    </div>
                    <Button variant="outline" size="sm">
                      <Wand2 className="h-4 w-4 mr-2" />
                      AI Enhance
                    </Button>
                  </div>
                </div>
              </div>

              {/* Settings Panel */}
              <div className="space-y-6">
                {/* Style Selection */}
                <div className="card-premium p-6">
                  <Label className="text-lg font-semibold mb-4 block">Visual Style</Label>
                  <div className="space-y-2">
                    {stylePresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setStyle(preset.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          style === preset.id
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-primary/50"
                        }`}
                      >
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs text-muted-foreground">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood Selection */}
                <div className="card-premium p-6">
                  <Label className="text-lg font-semibold mb-4 block">Mood</Label>
                  <Select value={mood} onValueChange={setMood}>
                    <SelectTrigger className="input-premium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {moodPresets.map((m) => (
                        <SelectItem key={m} value={m} className="capitalize">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Scene Count */}
                <div className="card-premium p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-lg font-semibold">Number of Scenes</Label>
                    <Badge variant="secondary">{targetScenes}</Badge>
                  </div>
                  <Slider
                    value={[targetScenes]}
                    onValueChange={([value]) => setTargetScenes(value)}
                    min={3}
                    max={10}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>3 scenes</span>
                    <span>10 scenes</span>
                  </div>
                </div>

                {/* Voiceover Settings */}
                <div className="card-premium p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-lg font-semibold">Voiceover</Label>
                    <Switch checked={includeVoiceover} onCheckedChange={setIncludeVoiceover} />
                  </div>
                  {includeVoiceover && (
                    <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                      <SelectTrigger className="input-premium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceOptions.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} ({voice.style})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateMovie}
                  disabled={isGenerating || !title.trim() || !script.trim()}
                  className="w-full btn-premium h-14 text-lg font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Film className="h-5 w-5 mr-2" />
                      Generate Movie
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Storyboard Tab */}
          <TabsContent value="storyboard" className="space-y-6">
            {/* Progress Bar */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-premium p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <div className="absolute inset-0 h-6 w-6 rounded-full bg-primary/20 animate-ping" />
                    </div>
                    <div>
                      <p className="font-semibold">{currentStep}</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(overallProgress)}% complete
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-primary/30 bg-primary/5">
                    <Clock className="h-3 w-3 mr-1" />
                    ~{Math.ceil((100 - overallProgress) / 10)} min remaining
                  </Badge>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </motion.div>
            )}

            {/* Scenes Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {scenes.map((scene, index) => (
                  <motion.div
                    key={scene.scene_number}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.1 }}
                    className={`card-premium p-4 cursor-pointer hover:scale-[1.02] transition-transform ${
                      selectedScene?.scene_number === scene.scene_number
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => setSelectedScene(scene)}
                  >
                    {/* Scene Preview */}
                    <div className="aspect-video bg-gradient-to-br from-card to-background rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                      {scene.status === "completed" && scene.video_url ? (
                        <video
                          src={scene.video_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : scene.status === "generating" ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">Generating...</span>
                        </div>
                      ) : (
                        <Film className="h-8 w-8 text-muted-foreground/50" />
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        {scene.status === "completed" && (
                          <Badge className="bg-green-500/90">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Done
                          </Badge>
                        )}
                        {scene.status === "generating" && (
                          <Badge className="bg-primary/90">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Generating
                          </Badge>
                        )}
                        {scene.status === "failed" && (
                          <Badge className="bg-destructive/90">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Scene Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          Scene {scene.scene_number}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {scene.duration}s
                        </span>
                      </div>
                      <h3 className="font-semibold line-clamp-1">{scene.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {scene.visual_prompt}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{scene.camera_movement}</span>
                        <span>•</span>
                        <span className="capitalize">{scene.shot_type}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Empty state */}
              {scenes.length === 0 && !isGenerating && (
                <div className="col-span-full">
                  <div className="card-premium p-12 text-center">
                    <Film className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Scenes Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Enter your script and generate a movie to see scenes here.
                    </p>
                    <Button onClick={() => setActiveTab("script")}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Go to Script
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Scene Details Panel */}
            <AnimatePresence>
              {selectedScene && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="card-premium p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Scene {selectedScene.scene_number}: {selectedScene.title}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedScene(null)}
                    >
                      Close
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm text-muted-foreground">Visual Prompt</Label>
                      <p className="mt-1">{selectedScene.visual_prompt}</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Camera</Label>
                        <p className="capitalize">{selectedScene.camera_movement} / {selectedScene.shot_type}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Duration</Label>
                        <p>{selectedScene.duration} seconds</p>
                      </div>
                      {selectedScene.voiceover_text && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Voiceover</Label>
                          <p className="italic">"{selectedScene.voiceover_text}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            {currentProject?.final_video_url ? (
              <div className="card-premium p-6">
                <div className="aspect-video bg-black rounded-xl overflow-hidden mb-6">
                  <video
                    src={currentProject.final_video_url}
                    controls
                    className="w-full h-full"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{currentProject.title}</h2>
                    <p className="text-muted-foreground">
                      {currentProject.total_scenes} scenes • Generated with AI
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                    <Button className="btn-premium">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-premium p-12 text-center">
                <Play className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Video Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Your final video will appear here once generation is complete.
                </p>
                {isGenerating ? (
                  <Badge variant="outline" className="border-primary/30 bg-primary/5">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Generation in progress...
                  </Badge>
                ) : (
                  <Button onClick={() => setActiveTab("script")}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Create a Movie
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

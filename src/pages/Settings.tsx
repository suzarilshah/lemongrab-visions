import { useState, useEffect } from "react";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [deployment, setDeployment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadSettings();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch (error) {
      navigate("/login");
    }
  };

  const loadSettings = () => {
    // Load settings from localStorage
    const stored = localStorage.getItem("lemongrab_settings");
    if (stored) {
      const settings = JSON.parse(stored);
      setEndpoint(settings.endpoint || "");
      setApiKey(settings.apiKey || "");
      setDeployment(settings.deployment || "");
    } else {
      // Set default values
      setEndpoint("https://suzar-mh225uaw-eastus2.cognitiveservices.azure.com/openai/v1/video/generations/jobs?api-version=preview");
      setApiKey("FpyNVx3HU6qv92ZTypcSBI250cmgYcRT8wPglshXt5plqnuz8Z4NJQQJ99BJACHYHv6XJ3w3AAAAACOGSaAO");
      setDeployment("sora");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const settings = { endpoint, apiKey, deployment };
      localStorage.setItem("lemongrab_settings", JSON.stringify(settings));
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl">Azure OpenAI Settings</CardTitle>
            <CardDescription>
              Configure your Azure OpenAI endpoint for Sora-2 video generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="endpoint">Azure OpenAI Endpoint</Label>
                <Input
                  id="endpoint"
                  type="url"
                  placeholder="https://your-resource.openai.azure.com/..."
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  required
                  className="border-border/50 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  The full endpoint URL including the API version parameter
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Your Azure OpenAI API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  className="border-border/50 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Your Azure OpenAI API key for authentication
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deployment">Deployment Name</Label>
                <Input
                  id="deployment"
                  type="text"
                  placeholder="sora-2"
                  value={deployment}
                  onChange={(e) => setDeployment(e.target.value)}
                  required
                  className="border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  The name of your Sora model deployment (e.g., sora-2 or sora)
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

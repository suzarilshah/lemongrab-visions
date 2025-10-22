import { useState, useEffect } from "react";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ArrowLeft, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [deployment, setDeployment] = useState("");
  const [soraVersion, setSoraVersion] = useState("sora-1");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Password reset state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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
      setSoraVersion(settings.soraVersion || "sora-1");
    } else {
      // Set default values
      setEndpoint("https://suzar-mh225uaw-eastus2.cognitiveservices.azure.com/openai/v1/video/generations/jobs?api-version=preview");
      setApiKey("FpyNVx3HU6qv92ZTypcSBI250cmgYcRT8wPglshXt5plqnuz8Z4NJQQJ99BJACHYHv6XJ3w3AAAAACOGSaAO");
      setDeployment("sora");
      setSoraVersion("sora-1");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const settings = { endpoint, apiKey, deployment, soraVersion };
      localStorage.setItem("lemongrab_settings", JSON.stringify(settings));
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsResettingPassword(true);

    try {
      await account.updatePassword(newPassword, currentPassword);
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsResettingPassword(false);
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

        <Card className="bg-background border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl">Azure OpenAI Settings</CardTitle>
            <CardDescription>
              Configure your Azure OpenAI endpoint for Sora video generation
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

              <div className="space-y-2">
                <Label htmlFor="soraVersion">Sora Version</Label>
                <Select value={soraVersion} onValueChange={setSoraVersion}>
                  <SelectTrigger id="soraVersion" className="border-border/50">
                    <SelectValue placeholder="Select Sora version" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sora-1">Sora 1 (Azure-specific API)</SelectItem>
                    <SelectItem value="sora-2">Sora 2 (OpenAI v1 API)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the Sora version you're using
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

        <Card className="bg-background border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl">Password Reset</CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="border-border/50"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isResettingPassword}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {isResettingPassword ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

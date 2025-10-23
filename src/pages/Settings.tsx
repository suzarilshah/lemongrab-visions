import { useState, useEffect } from "react";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ArrowLeft, KeyRound } from "lucide-react";
import { getProfiles, saveProfile, createProfile, deleteProfile, setActiveProfile, getActiveProfile, type Profile } from "@/lib/profiles";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [deployment, setDeployment] = useState("");
  const [soraVersion, setSoraVersion] = useState("sora-1");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  // Profiles state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [profileName, setProfileName] = useState<string>("");
  
  // Password reset state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    checkAuth();
    loadSettings();
    loadProfiles();
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
    const stored = localStorage.getItem("lemongrab_settings");
    if (stored) {
      const settings = JSON.parse(stored);
      setEndpoint(settings.endpoint || "");
      setApiKey(settings.apiKey || "");
      setDeployment(settings.deployment || "");
      setSoraVersion(settings.soraVersion || "sora-1");
    }
  };

  const loadProfiles = () => {
    const list = getProfiles();
    setProfiles(list);
    const active = getActiveProfile();
    if (active) {
      setActiveProfileId(active.id);
      setProfileName(active.name);
      setEndpoint(active.endpoint);
      setApiKey(active.apiKey);
      setDeployment(active.deployment);
      setSoraVersion(active.soraVersion);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const settings = { endpoint, apiKey, deployment, soraVersion };
      localStorage.setItem("lemongrab_settings", JSON.stringify(settings));
      // Save/update profile if name is provided
      if (profileName.trim()) {
        const existing = profiles.find(p => p.id === activeProfileId);
        const next: Profile = {
          id: existing?.id || Math.random().toString(36).slice(2,10),
          name: profileName.trim(),
          endpoint,
          apiKey,
          deployment,
          soraVersion: soraVersion as any,
        };
        saveProfile(next);
        setActiveProfile(next.id);
        setActiveProfileId(next.id);
        setProfiles(getProfiles());
      }
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
            <CardTitle className="text-2xl">Profiles</CardTitle>
            <CardDescription>
              Create and manage Azure profiles. Each profile stores endpoint, API key, deployment and Sora version.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="activeProfile">Active Profile</Label>
                <select
                  id="activeProfile"
                  className="w-full rounded-md border border-border/50 bg-background px-3 py-2"
                  value={activeProfileId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setActiveProfile(id);
                    setActiveProfileId(id);
                    const p = getProfiles().find(p => p.id === id);
                    if (p) {
                      setProfileName(p.name);
                      setEndpoint(p.endpoint);
                      setApiKey(p.apiKey);
                      setDeployment(p.deployment);
                      setSoraVersion(p.soraVersion);
                    }
                  }}
                >
                  {profiles.length === 0 ? (
                    <option value="">No profiles yet</option>
                  ) : (
                    profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  )}
                </select>
                <p className="text-xs text-muted-foreground">The active profile will be used on the Dashboard.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profileName">Profile Name</Label>
                  <Input id="profileName" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="e.g., Prod Sora 2" />
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
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endpoint">Azure OpenAI Endpoint</Label>
                <Input id="endpoint" type="url" placeholder="https://your-resource.openai.azure.com/..." value={endpoint} onChange={(e) => setEndpoint(e.target.value)} required className="border-border/50 font-mono text-sm" />
                <p className="text-xs text-muted-foreground">The full endpoint URL including the API version parameter</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input id="apiKey" type="password" placeholder="Your Azure OpenAI API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required className="border-border/50 font-mono text-sm" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deployment">Deployment Name</Label>
                <Input id="deployment" type="text" placeholder="sora-2" value={deployment} onChange={(e) => setDeployment(e.target.value)} required className="border-border/50" />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isLoading} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Profile"}
                </Button>
                <Button variant="secondary" onClick={() => {
                  setProfileName(""); setEndpoint(""); setApiKey(""); setDeployment(""); setSoraVersion("sora-1");
                }}>New</Button>
                {activeProfileId && (
                  <Button variant="destructive" onClick={() => { deleteProfile(activeProfileId); setProfiles(getProfiles()); }}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
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

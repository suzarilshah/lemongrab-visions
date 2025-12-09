import { useState, useEffect } from "react";
import { getCurrentUser, updatePassword, User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, ChevronDown, Settings as SettingsIcon, Shield, Zap, Plus } from "lucide-react";
import { getProfiles, saveProfile, createProfile, deleteProfile, setActiveProfile, getActiveProfile, type Profile, type SoraVersion } from "@/lib/profiles";
import { useNavigate } from "react-router-dom";
import ProfilesList from "@/components/ProfilesList";
import ProfileEditor from "@/components/ProfileEditor";

export default function Settings() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Profiles state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Password reset state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordSectionOpen, setPasswordSectionOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    loadProfiles();
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

  const loadProfiles = async () => {
    const list = await getProfiles();
    setProfiles(list);
    const active = await getActiveProfile();
    if (active) {
      setActiveProfileId(active.id);
    }
  };

  const handleCreateNew = () => {
    setEditingProfile(null);
    setEditorOpen(true);
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setEditorOpen(true);
  };

  const handleSave = async (data: { name: string; endpoint: string; apiKey: string; deployment: string; soraVersion: SoraVersion }) => {
    setIsLoading(true);
    try {
      if (editingProfile) {
        const updated: Profile = { ...editingProfile, ...data };
        await saveProfile(updated);
        toast.success("Profile updated successfully!");
      } else {
        await createProfile(data);
        toast.success("Profile created successfully!");
      }
      await loadProfiles();
      setEditorOpen(false);
      setEditingProfile(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save profile";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this profile?")) {
      await deleteProfile(id);
      await loadProfiles();
      toast.success("Profile deleted");
    }
  };

  const handleSetActive = async (id: string) => {
    await setActiveProfile(id);
    setActiveProfileId(id);
    toast.success("Active profile updated");
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
      await updatePassword(currentPassword, newPassword);
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSectionOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update password";
      toast.error(message);
    } finally {
      setIsResettingPassword(false);
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
                <SettingsIcon className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Settings</h1>
              </div>
            </div>
            
            {user && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{user.email}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left Column - Profiles */}
          <div className="lg:col-span-3 space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Azure Profiles</h2>
                  <p className="text-sm text-muted-foreground">Manage your Azure OpenAI configurations</p>
                </div>
              </div>
              <Button
                onClick={handleCreateNew}
                className="btn-premium"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Profile
              </Button>
            </div>
            
            {/* Profiles List or Editor */}
            {editorOpen ? (
              <div className="animate-in">
                <ProfileEditor
                  profile={editingProfile}
                  onSave={handleSave}
                  onCancel={() => {
                    setEditorOpen(false);
                    setEditingProfile(null);
                  }}
                  isLoading={isLoading}
                />
              </div>
            ) : (
              <div className="animate-in">
                <ProfilesList
                  profiles={profiles}
                  activeProfileId={activeProfileId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSetActive={handleSetActive}
                  onCreateNew={handleCreateNew}
                />
              </div>
            )}
          </div>

          {/* Right Column - Account Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Section Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Account Security</h2>
                <p className="text-sm text-muted-foreground">Manage your password</p>
              </div>
            </div>
            
            {/* Password Reset Section */}
            <Collapsible open={passwordSectionOpen} onOpenChange={setPasswordSectionOpen}>
              <Card className="card-premium">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-primary/5 transition-colors rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <KeyRound className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">Change Password</CardTitle>
                          <CardDescription className="text-sm">Update your account password</CardDescription>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${passwordSectionOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="input-premium"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="input-premium"
                        />
                        <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="input-premium"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full btn-premium" 
                        disabled={isResettingPassword}
                      >
                        {isResettingPassword ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Updating...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4" />
                            Update Password
                          </div>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
            
            {/* Account Info Card */}
            {user && (
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="text-base">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="text-sm font-medium">{user.name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Member since</span>
                    <span className="text-sm font-medium">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

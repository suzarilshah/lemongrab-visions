import { useState, useEffect } from "react";
import { account, functions } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, ChevronDown, RefreshCw } from "lucide-react";
import { getProfiles, saveProfile, createProfile, deleteProfile, setActiveProfile, getActiveProfile, type Profile, type SoraVersion } from "@/lib/profiles";
import { useNavigate } from "react-router-dom";
import ProfilesList from "@/components/ProfilesList";
import ProfileEditor from "@/components/ProfileEditor";
import { ExecutionMethod } from "appwrite";

export default function Settings() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

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

  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSectionOpen, setMigrationSectionOpen] = useState(false);
  const [migrationResults, setMigrationResults] = useState<any>(null);

  useEffect(() => {
    checkAuth();
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

  const handleSave = (data: { name: string; endpoint: string; apiKey: string; deployment: string; soraVersion: SoraVersion }) => {
    setIsLoading(true);
    try {
      if (editingProfile) {
        // Update existing
        const updated: Profile = { ...editingProfile, ...data };
        saveProfile(updated);
        toast.success("Profile updated successfully!");
      } else {
        // Create new
        const newProfile = createProfile(data);
        toast.success("Profile created successfully!");
      }
      loadProfiles();
      setEditorOpen(false);
      setEditingProfile(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this profile?")) {
      deleteProfile(id);
      loadProfiles();
      toast.success("Profile deleted");
    }
  };

  const handleSetActive = (id: string) => {
    setActiveProfile(id);
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
      await account.updatePassword(newPassword, currentPassword);
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSectionOpen(false);
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleFixVideoPermissions = async () => {
    setIsMigrating(true);
    setMigrationResults(null);
    
    try {
      toast.info("Starting video permissions migration...");
      
      const response = await functions.createExecution(
        'fix-video-permissions',
        '',
        false,
        '/',
        ExecutionMethod.POST
      );

      const result = JSON.parse(response.responseBody);
      
      if (result.success) {
        setMigrationResults(result.results);
        toast.success(`Migration complete! Updated ${result.results.updated} videos, ${result.results.alreadyPublic} already public.`);
      } else {
        toast.error(result.error || "Migration failed");
      }
    } catch (error: any) {
      console.error("Migration error:", error);
      toast.error(error.message || "Failed to run migration");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Profiles List */}
          <ProfilesList
            profiles={profiles}
            activeProfileId={activeProfileId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSetActive={handleSetActive}
            onCreateNew={handleCreateNew}
          />

          {/* Right: Profile Editor (conditional) */}
          {editorOpen && (
            <ProfileEditor
              profile={editingProfile}
              onSave={handleSave}
              onCancel={() => {
                setEditorOpen(false);
                setEditingProfile(null);
              }}
              isLoading={isLoading}
            />
          )}

          {/* Placeholder when editor is closed */}
          {!editorOpen && (
            <Card className="h-full flex items-center justify-center border-dashed">
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-2">No profile selected</p>
                <p className="text-sm text-muted-foreground">
                  Click "Create New" or "Edit" to manage profiles
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Password Reset Section (Collapsible) */}
        <Collapsible open={passwordSectionOpen} onOpenChange={setPasswordSectionOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Password Reset</CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${passwordSectionOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0">
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
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
                    />
                    <p className="text-xs text-muted-foreground">Must be at least 8 characters long</p>
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
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isResettingPassword}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    {isResettingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Video Permissions Migration Section (Collapsible) */}
        <Collapsible open={migrationSectionOpen} onOpenChange={setMigrationSectionOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Fix Video Permissions</CardTitle>
                    <CardDescription>One-time migration to fix existing video access</CardDescription>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${migrationSectionOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <p className="text-sm text-muted-foreground">
                  If you have existing videos that cannot be viewed or downloaded, run this migration to add public read permissions.
                  This is safe to run multiple times.
                </p>

                <Button 
                  onClick={handleFixVideoPermissions} 
                  className="w-full" 
                  disabled={isMigrating}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isMigrating ? "animate-spin" : ""}`} />
                  {isMigrating ? "Running Migration..." : "Fix Video Permissions"}
                </Button>

                {migrationResults && (
                  <div className="p-4 bg-muted rounded-md space-y-2">
                    <p className="text-sm font-medium">Migration Results:</p>
                    <ul className="text-sm space-y-1">
                      <li>✓ Processed: {migrationResults.processed} files</li>
                      <li>✓ Updated: {migrationResults.updated} files</li>
                      <li>✓ Already public: {migrationResults.alreadyPublic} files</li>
                      {migrationResults.errors.length > 0 && (
                        <li className="text-destructive">✗ Errors: {migrationResults.errors.length}</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}

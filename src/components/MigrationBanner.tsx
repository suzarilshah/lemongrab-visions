import { useState, useEffect } from "react";
import { functions } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MigrationBanner() {
  const [hasLocalData, setHasLocalData] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    checkForLocalData();
  }, []);

  const checkForLocalData = () => {
    const settings = localStorage.getItem("lemongrab_settings");
    const videos = localStorage.getItem("lemongrab_videos");
    
    const hasSettings = settings && settings !== "null" && JSON.parse(settings || "{}").profiles?.length > 0;
    const hasVideos = videos && videos !== "null" && JSON.parse(videos || "[]").length > 0;
    
    setHasLocalData(!!(hasSettings || hasVideos));
  };

  const handleMigrate = async () => {
    setIsMigrating(true);
    
    try {
      // Extract localStorage data
      const settingsRaw = localStorage.getItem("lemongrab_settings");
      const videosRaw = localStorage.getItem("lemongrab_videos");
      
      const oldSettings = settingsRaw ? JSON.parse(settingsRaw) : {};
      const oldVideos = videosRaw ? JSON.parse(videosRaw) : [];
      
      // Transform to migration format
      const migrationData = {
        profiles: oldSettings.profiles?.map((p: any) => ({
          name: p.name,
          endpoint: p.endpoint,
          apiKey: p.apiKey,
          deployment: p.deployment,
          soraVersion: p.soraVersion,
          isActive: p.isActive
        })) || [],
        videos: oldVideos.map((v: any) => ({
          appwriteFileId: v.id,
          url: v.url,
          prompt: v.prompt,
          height: v.height,
          width: v.width,
          duration: v.duration,
          soraVersion: v.soraVersion,
          azureVideoId: v.azureVideoId
        }))
      };
      
      console.log("[Migration] Starting migration with data:", migrationData);
      
      // Call migration function
      const result = await functions.createExecution(
        "migrate-localstorage",
        JSON.stringify(migrationData),
        false
      );
      
      console.log("[Migration] Function result:", result);
      
      const response = JSON.parse(result.responseBody);
      
      if (response.success) {
        const { results } = response;
        
        toast.success(
          `Migration complete! Migrated ${results.profilesMigrated} profiles and ${results.videosMigrated} videos.`
        );
        
        if (results.errors?.length > 0) {
          console.warn("[Migration] Errors during migration:", results.errors);
          toast.warning(`${results.errors.length} items had errors. Check console for details.`);
        }
        
        // Clear localStorage after successful migration
        localStorage.removeItem("lemongrab_settings");
        localStorage.removeItem("lemongrab_videos");
        
        setMigrationComplete(true);
        
        // Reload page after 2 seconds to show migrated data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(response.error || "Migration failed");
      }
    } catch (error: any) {
      console.error("[Migration] Error:", error);
      toast.error(error.message || "Failed to migrate data");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("lemongrab_migration_dismissed", "true");
  };

  // Don't show if no local data or already dismissed
  if (!hasLocalData || !showBanner || migrationComplete) {
    return null;
  }

  // Check if user dismissed banner
  if (localStorage.getItem("lemongrab_migration_dismissed")) {
    return null;
  }

  return (
    <Card className="border-orange-500/50 bg-orange-500/5">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Database className="h-6 w-6 text-orange-500 mt-1" />
          <div className="flex-1">
            <CardTitle className="text-lg">Local Data Detected</CardTitle>
            <CardDescription className="mt-1">
              We found profiles and videos stored in your browser's local storage. 
              Migrate them to Appwrite Cloud for cross-device access.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {migrationComplete ? (
          <Alert className="bg-green-500/10 border-green-500/50">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">
              Migration successful! Reloading page to show your migrated data...
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleMigrate}
              disabled={isMigrating}
              className="flex-1"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Migrate to Cloud
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              disabled={isMigrating}
            >
              Dismiss
            </Button>
          </div>
        )}
        
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your data will be securely migrated to Appwrite and accessible from any device. 
            Local storage will be cleared after successful migration.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

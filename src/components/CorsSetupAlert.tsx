import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CorsSetupAlert() {
  const currentDomain = window.location.origin;
  
  const openAppwriteConsole = () => {
    window.open("https://cloud.appwrite.io/console", "_blank");
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Connection Error: CORS Setup Required</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>Your Appwrite backend needs to allow requests from this domain.</p>
        <div className="bg-background/50 p-2 rounded text-xs font-mono break-all">
          {currentDomain}
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-semibold">To fix this:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Go to your Appwrite Console</li>
            <li>Open your project settings</li>
            <li>Navigate to <strong>Settings → Platforms</strong></li>
            <li>Click <strong>Add Platform</strong></li>
            <li>Select <strong>Web App</strong></li>
            <li>Add the domain above as the hostname</li>
            <li>Save and refresh this page</li>
          </ol>
        </div>
        <Button
          onClick={openAppwriteConsole}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          Open Appwrite Console
          <ExternalLink className="ml-2 h-3 w-3" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}

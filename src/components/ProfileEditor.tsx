import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Server, Key, Box, Zap } from "lucide-react";
import { type Profile, type SoraVersion } from "@/lib/profiles";

interface ProfileEditorProps {
  profile: Profile | null;
  onSave: (data: { name: string; endpoint: string; apiKey: string; deployment: string; soraVersion: SoraVersion }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ProfileEditor({ profile, onSave, onCancel, isLoading }: ProfileEditorProps) {
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [deployment, setDeployment] = useState("");
  const [soraVersion, setSoraVersion] = useState<SoraVersion>("sora-1");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEndpoint(profile.endpoint);
      setApiKey(profile.apiKey);
      setDeployment(profile.deployment);
      setSoraVersion(profile.soraVersion);
    } else {
      setName("");
      setEndpoint("");
      setApiKey("");
      setDeployment("");
      setSoraVersion("sora-1");
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name: name.trim(), endpoint, apiKey, deployment, soraVersion });
  };

  return (
    <div className="card-premium rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">
            {profile ? "Edit Profile" : "Create Profile"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {profile ? "Update your Azure OpenAI settings" : "Configure a new Azure OpenAI connection"}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onCancel}
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm flex items-center gap-2">
              <Box className="h-3.5 w-3.5 text-muted-foreground" />
              Profile Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Sora 2"
              required
              className="input-premium"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="soraVersion" className="text-sm flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              Sora Version
            </Label>
            <Select value={soraVersion} onValueChange={(v) => setSoraVersion(v as SoraVersion)}>
              <SelectTrigger className="input-premium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sora-1">
                  <div className="flex items-center gap-2">
                    <span>Sora 1</span>
                    <span className="text-xs text-muted-foreground">(Azure API)</span>
                  </div>
                </SelectItem>
                <SelectItem value="sora-2">
                  <div className="flex items-center gap-2">
                    <span>Sora 2</span>
                    <span className="text-xs text-muted-foreground">(OpenAI v1 API)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endpoint" className="text-sm flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-muted-foreground" />
            Azure OpenAI Endpoint
          </Label>
          <Input
            id="endpoint"
            type="url"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://your-resource.openai.azure.com/..."
            required
            className="input-premium font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Full endpoint URL with API version parameter
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey" className="text-sm flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            API Key
          </Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="••••••••••••••••"
            required
            className="input-premium font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deployment" className="text-sm flex items-center gap-2">
            <Box className="h-3.5 w-3.5 text-muted-foreground" />
            Deployment Name
          </Label>
          <Input
            id="deployment"
            value={deployment}
            onChange={(e) => setDeployment(e.target.value)}
            placeholder="sora-2"
            required
            className="input-premium"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border/50">
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="flex-1 btn-premium h-11"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Profile
              </div>
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="hover:bg-muted"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

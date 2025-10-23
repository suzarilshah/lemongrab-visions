import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";
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
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>{profile ? "Edit Profile" : "Create Profile"}</CardTitle>
          <CardDescription className="mt-1">
            {profile ? "Update profile settings" : "Add a new Azure OpenAI profile"}
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Profile Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Prod Sora 2"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="soraVersion">Sora Version *</Label>
              <Select value={soraVersion} onValueChange={(v) => setSoraVersion(v as SoraVersion)}>
                <SelectTrigger id="soraVersion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sora-1">Sora 1 (Azure-specific API)</SelectItem>
                  <SelectItem value="sora-2">Sora 2 (OpenAI v1 API)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endpoint">Azure OpenAI Endpoint *</Label>
            <Input
              id="endpoint"
              type="url"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://your-resource.openai.azure.com/..."
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              The full endpoint URL including the API version parameter
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your Azure OpenAI API key"
              required
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deployment">Deployment Name *</Label>
            <Input
              id="deployment"
              value={deployment}
              onChange={(e) => setDeployment(e.target.value)}
              placeholder="sora-2"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : "Save Profile"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

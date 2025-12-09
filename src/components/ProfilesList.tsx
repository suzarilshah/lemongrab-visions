import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, CheckCircle, Zap, Server } from "lucide-react";
import { type Profile } from "@/lib/profiles";

interface ProfilesListProps {
  profiles: Profile[];
  activeProfileId: string;
  onEdit: (profile: Profile) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onCreateNew: () => void;
}

export default function ProfilesList({
  profiles,
  activeProfileId,
  onEdit,
  onDelete,
  onSetActive,
}: ProfilesListProps) {
  return (
    <div className="space-y-4">
      {profiles.length === 0 ? (
        <div className="card-premium rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Server className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">No profiles configured</h3>
          <p className="text-sm text-muted-foreground">
            Add your Azure OpenAI credentials to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile, index) => {
            const isActive = profile.id === activeProfileId;
            let domain = "No endpoint";
            try {
              domain = new URL(profile.endpoint).hostname.replace("www.", "");
            } catch {
              domain = "Invalid URL";
            }

            return (
              <div
                key={profile.id}
                className={`card-premium rounded-xl p-5 transition-all animate-in ${
                  isActive 
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_30px_hsla(47,100%,50%,0.1)]" 
                    : "hover:border-primary/30"
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold truncate">{profile.name}</h3>
                      {isActive && (
                        <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                        <Server className="h-3.5 w-3.5" />
                        {domain}
                      </p>
                      <p className="text-sm flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium">
                          {profile.soraVersion === "sora-1" ? "Sora 1" : "Sora 2"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(profile)}
                    className="flex-1 h-9 hover:bg-primary/10 hover:border-primary/50"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant={isActive ? "secondary" : "default"}
                    size="sm"
                    onClick={() => onSetActive(profile.id)}
                    disabled={isActive}
                    className={`flex-1 h-9 ${!isActive ? "btn-premium" : ""}`}
                  >
                    {isActive ? "Active" : "Set Active"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(profile.id)}
                    className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, CheckCircle, Plus } from "lucide-react";
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
  onCreateNew,
}: ProfilesListProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Profiles</CardTitle>
        <Button onClick={onCreateNew} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create New
        </Button>
      </CardHeader>
      <CardContent>
        {profiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-2">No profiles yet</p>
            <p className="text-sm">Click "Create New" to add your first profile</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId;
              const domain = profile.endpoint
                ? new URL(profile.endpoint).hostname.replace("www.", "")
                : "No endpoint";

              return (
                <div
                  key={profile.id}
                  className={`
                    p-4 rounded-lg border transition-all
                    ${isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                  `}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{profile.name}</h3>
                        {isActive && (
                          <Badge variant="default" className="text-xs gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {domain}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profile.soraVersion === "sora-1" ? "Sora 1" : "Sora 2"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(profile)}
                      className="flex-1"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant={isActive ? "secondary" : "default"}
                      size="sm"
                      onClick={() => onSetActive(profile.id)}
                      disabled={isActive}
                      className="flex-1"
                    >
                      {isActive ? "Active" : "Set Active"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(profile.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

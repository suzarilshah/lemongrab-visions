import { useState, useEffect } from "react";
import { getGenerationRecords, GenerationRecord } from "@/lib/costTracking";
import { DollarSign, TrendingUp, Video, BarChart3, Layers, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CostTracking() {
  const [records, setRecords] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCost: 0,
    totalGenerations: 0,
    bySoraModel: {} as Record<string, number>,
    byMode: {} as Record<string, number>,
    byProfile: {} as Record<string, number>,
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await getGenerationRecords(100);
      setRecords(data);

      const totalCost = data.reduce((sum, r) => sum + r.estimatedCost, 0);
      const bySoraModel: Record<string, number> = {};
      const byMode: Record<string, number> = {};
      const byProfile: Record<string, number> = {};

      data.forEach((record) => {
        bySoraModel[record.soraModel] = (bySoraModel[record.soraModel] || 0) + record.estimatedCost;
        byMode[record.generationMode] = (byMode[record.generationMode] || 0) + record.estimatedCost;
        const profileKey = record.profileName || 'default';
        byProfile[profileKey] = (byProfile[profileKey] || 0) + record.estimatedCost;
      });

      setStats({
        totalCost,
        totalGenerations: data.length,
        bySoraModel,
        byMode,
        byProfile,
      });
    } catch (error: unknown) {
      console.error("Failed to load cost records:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Cost Analytics</h2>
          <p className="text-sm text-muted-foreground">Track your video generation spending</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-premium rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Total Spent</span>
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gradient">${stats.totalCost.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </div>

        <div className="card-premium rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Videos Generated</span>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Video className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold">{stats.totalGenerations}</p>
          <p className="text-xs text-muted-foreground mt-1">Total creations</p>
        </div>

        <div className="card-premium rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Sora 1 Spend</span>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </div>
          </div>
          <p className="text-3xl font-bold">${(stats.bySoraModel["sora-1"] || 0).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Azure API</p>
        </div>

        <div className="card-premium rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Sora 2 Spend</span>
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold">${(stats.bySoraModel["sora-2"] || 0).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">OpenAI v1 API</p>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Mode */}
        <div className="card-premium rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">By Generation Mode</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.byMode).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              Object.entries(stats.byMode).map(([mode, cost]) => (
                <div key={mode} className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium capitalize">{mode.replace(/-/g, ' ')}</span>
                  </div>
                  <span className="text-sm font-bold">${cost.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Profile */}
        <div className="card-premium rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">By Profile</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.byProfile).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              Object.entries(stats.byProfile).map(([profile, cost]) => (
                <div key={profile} className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                  <span className="text-sm font-medium">{profile}</span>
                  <span className="text-sm font-bold">${cost.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="card-premium rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h3 className="font-semibold">Generation History</h3>
          <p className="text-sm text-muted-foreground mt-1">Detailed record of all video generations</p>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Video className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No generations yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Video ID</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Profile</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Model</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Mode</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Resolution</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Duration</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record, index) => (
                  <TableRow 
                    key={record.id}
                    className="animate-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(record.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {record.videoId ? (
                        <span className="text-primary">{record.videoId.slice(0, 12)}...</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{record.profileName || 'Default'}</TableCell>
                    <TableCell>
                      <Badge 
                        className={`text-xs ${
                          record.soraModel === 'sora-2' 
                            ? 'bg-primary/10 text-primary border-primary/20' 
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {record.soraModel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{record.generationMode.replace(/-/g, ' ')}</TableCell>
                    <TableCell className="text-xs">{record.resolution}</TableCell>
                    <TableCell className="text-xs">{record.duration}s</TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      ${record.estimatedCost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

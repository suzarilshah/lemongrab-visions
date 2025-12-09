import { useEffect, useState } from "react";
import { getGenerationRecords, updateGenerationStatus, GenerationRecord } from "@/lib/costTracking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cancelVideoJob } from "@/lib/videoGenerator";
import { getActiveProfile } from "@/lib/profiles";
import { X, RefreshCw, List, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

export default function Generations() {
  const [rows, setRows] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const records = await getGenerationRecords(100);
      setRows(records);
    } catch (e) {
      console.error("[Generations] load error", e);
      toast.error("Failed to load generations");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleCancelJob(jobId: string, soraModel: string) {
    try {
      const profile = await getActiveProfile();
      if (!profile) {
        toast.error("No active profile found");
        return;
      }
      const soraVersion = soraModel === 'sora-2' ? 'sora-2' : 'sora-1';
      
      await cancelVideoJob(jobId, profile.endpoint, profile.apiKey, soraVersion);
      await updateGenerationStatus(jobId, 'canceled');
      
      toast.success('Video generation canceled');
      await load();
    } catch (error) {
      console.error('[Generations] Cancel error:', error);
      toast.error('Failed to cancel generation');
    }
  }

  const getStatusBadge = (status: string | undefined) => {
    const statusLower = (status || 'completed').toLowerCase();
    
    switch (statusLower) {
      case 'completed':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        );
      case 'running':
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      case 'queued':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1">
            <Clock className="h-3 w-3" />
            Queued
          </Badge>
        );
      case 'failed':
      case 'canceled':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
            <XCircle className="h-3 w-3" />
            {statusLower === 'failed' ? 'Failed' : 'Canceled'}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground">
            {status || 'Unknown'}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <List className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Generation History</h2>
            <p className="text-sm text-muted-foreground">Track all your video generation jobs</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh} 
          disabled={loading || refreshing}
          className="hover:bg-primary/10 hover:border-primary/50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="card-premium rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading generations...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <List className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">No generations yet</h3>
            <p className="text-sm text-muted-foreground">
              Your video generation history will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Model</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Mode</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Resolution</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Duration</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Prompt</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Cost</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, index) => (
                  <TableRow 
                    key={r.id}
                    className="animate-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                      <br />
                      <span className="text-[10px]">
                        {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell>
                      <Badge 
                        className={`text-xs ${
                          r.soraModel === 'sora-2' 
                            ? 'bg-primary/10 text-primary border-primary/20' 
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {r.soraModel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{r.generationMode.replace(/-/g, ' ')}</TableCell>
                    <TableCell className="text-xs font-mono">{r.resolution}</TableCell>
                    <TableCell className="text-xs">{r.duration}s</TableCell>
                    <TableCell className="text-xs max-w-[200px]">
                      <span className="truncate block" title={r.prompt}>
                        {r.prompt.slice(0, 50)}...
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      ${r.estimatedCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {(r.status === 'running' || r.status === 'queued') && r.jobId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancelJob(r.jobId!, r.soraModel)}
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          title="Cancel generation"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
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

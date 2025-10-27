import { useEffect, useState } from "react";
import { databases } from "@/lib/appwrite";
import { DATABASE_ID, GENERATIONS_COLLECTION_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cancelVideoJob } from "@/lib/videoGenerator";
import { getActiveProfile } from "@/lib/profiles";
import { updateGenerationStatus } from "@/lib/costTracking";
import { X } from "lucide-react";

interface GenerationRow {
  $id: string;
  $createdAt: string;
  prompt: string;
  soraModel: string;
  duration: number;
  resolution: string;
  variants: number;
  generationMode: string;
  estimatedCost: number;
  status?: string;
  jobId?: string;
  videoId?: string;
}

export default function Generations() {
  const [rows, setRows] = useState<GenerationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await databases.listDocuments(
        DATABASE_ID,
        GENERATIONS_COLLECTION_ID,
        [Query.orderDesc("$createdAt"), Query.limit(100)]
      );
      setRows(res.documents as any);
    } catch (e) {
      console.error("[Generations] load error", e);
      toast.error("Failed to load generations");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelJob(jobId: string, soraModel: string) {
    try {
      const profile = await getActiveProfile();
      const soraVersion = soraModel === 'sora-2' ? 'sora-2' : 'sora-1';
      
      await cancelVideoJob(jobId, profile.endpoint, profile.apiKey, soraVersion);
      await updateGenerationStatus(jobId, 'canceled');
      
      toast.success('Video generation canceled');
      await load(); // Reload the list
    } catch (error) {
      console.error('[Generations] Cancel error:', error);
      toast.error('Failed to cancel generation');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Generations</h2>
          <p className="text-muted-foreground">All video generations with live status</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
      </div>

      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No generations yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Video ID</TableHead>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Resolution</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.$id}>
                      <TableCell className="text-xs">{new Date(r.$createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{r.status || "completed"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{r.videoId || "-"}</TableCell>
                      <TableCell className="text-xs font-mono">{r.jobId || "-"}</TableCell>
                      <TableCell className="text-xs">{r.soraModel}</TableCell>
                      <TableCell className="text-xs capitalize">{r.generationMode}</TableCell>
                      <TableCell className="text-xs">{r.resolution}</TableCell>
                      <TableCell className="text-xs">{r.duration}s</TableCell>
                      <TableCell className="text-xs">{r.variants}</TableCell>
                      <TableCell className="text-xs max-w-[240px] truncate" title={r.prompt}>{r.prompt}</TableCell>
                      <TableCell className="text-right font-bold">${r.estimatedCost.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        {(r.status === 'running' || r.status === 'queued') && r.jobId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelJob(r.jobId!, r.soraModel)}
                            className="h-7 w-7 p-0"
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
        </CardContent>
      </Card>
    </div>
  );
}

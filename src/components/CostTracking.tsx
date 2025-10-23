import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { databases } from "@/lib/appwrite";
import { DATABASE_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { DollarSign, TrendingUp, Video, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const GENERATIONS_COLLECTION_ID = "video_generations";

interface GenerationRecord {
  $id: string;
  $createdAt: string;
  prompt: string;
  soraModel: string;
  duration: number;
  resolution: string;
  variants: number;
  generationMode: string;
  estimatedCost: number;
  videoId?: string;
}

export default function CostTracking() {
  const [records, setRecords] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCost: 0,
    totalGenerations: 0,
    bySoraModel: {} as Record<string, number>,
    byMode: {} as Record<string, number>,
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        DATABASE_ID,
        GENERATIONS_COLLECTION_ID,
        [Query.orderDesc("$createdAt"), Query.limit(100)]
      );

      const data = response.documents as unknown as GenerationRecord[];
      setRecords(data);

      // Calculate statistics
      const totalCost = data.reduce((sum, r) => sum + r.estimatedCost, 0);
      const bySoraModel: Record<string, number> = {};
      const byMode: Record<string, number> = {};

      data.forEach((record) => {
        bySoraModel[record.soraModel] = (bySoraModel[record.soraModel] || 0) + record.estimatedCost;
        byMode[record.generationMode] = (byMode[record.generationMode] || 0) + record.estimatedCost;
      });

      setStats({
        totalCost,
        totalGenerations: data.length,
        bySoraModel,
        byMode,
      });
    } catch (error: any) {
      console.error("Failed to load cost records:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Cost Tracking</h2>
        <p className="text-muted-foreground">Track your video generation costs and usage</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time spending</p>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
            <Video className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGenerations}</div>
            <p className="text-xs text-muted-foreground">Videos created</p>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sora 1</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.bySoraModel["sora-1"] || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total spent</p>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sora 2</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.bySoraModel["sora-2"] || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total spent</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Mode */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle>Cost by Generation Mode</CardTitle>
          <CardDescription>Breakdown of spending by video generation type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.byMode).map(([mode, cost]) => (
              <div key={mode} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium capitalize">{mode}</span>
                </div>
                <span className="text-sm font-bold">${cost.toFixed(2)}</span>
              </div>
            ))}
            {Object.keys(stats.byMode).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No data available yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generation History Table */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle>Generation History</CardTitle>
          <CardDescription>Detailed record of all video generations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No generations yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Video ID</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Resolution</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.$id}>
                      <TableCell className="text-xs">
                        {formatDate(record.$createdAt)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {record.videoId ? (
                          <span className="truncate max-w-[100px] inline-block">
                            {record.videoId}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {record.soraModel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {record.generationMode}
                      </TableCell>
                      <TableCell className="text-xs">{record.resolution}</TableCell>
                      <TableCell className="text-xs">{record.duration}s</TableCell>
                      <TableCell className="text-xs">{record.variants}</TableCell>
                      <TableCell className="text-right font-bold">
                        ${record.estimatedCost.toFixed(2)}
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

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Copy, Trash2, Terminal } from "lucide-react";
import { toast } from "sonner";

interface ApiConsoleProps {
  logs: any[];
  onClear: () => void;
}

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

function pretty(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export default function ApiConsole({ logs, onClear }: ApiConsoleProps) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const count = logs?.length ?? 0;

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(pretty(logs));
      toast.success("Copied all logs");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const summary = useMemo(() => {
    const reqs = logs.filter((l) => l.type === "request").length;
    const res = logs.filter((l) => l.type === "response").length;
    return { reqs, res };
  }, [logs]);

  return (
    <section aria-label="API Console" className="space-y-3">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">API Console</h2>
            <Badge variant="secondary">{count} logs</Badge>
            <Badge variant="outline">{summary.reqs} req</Badge>
            <Badge variant="outline">{summary.res} res</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyAll}>
              <Copy className="h-4 w-4 mr-1" /> Copy all
            </Button>
            <Button variant="destructive" size="sm" onClick={onClear}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Toggle">
                {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <Card className="p-0 overflow-hidden">
            <ScrollArea className="h-72 w-full overflow-x-auto">
              <ul className="divide-y divide-border">
                {logs.map((l: any) => {
                  const id = l.id ?? `${l.time ?? Date.now()}-${Math.random()}`;
                  const isReq = l.type === "request";
                  const isRes = l.type === "response";
                  return (
                    <li key={id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 truncate">
                            <Badge variant={isReq ? "secondary" : isRes ? "outline" : "default"}>
                              {l.type}
                            </Badge>
                            {l.method && <span className="text-xs font-medium text-muted-foreground">{l.method}</span>}
                            {l.status && (
                              <span className="text-xs font-medium text-muted-foreground">{l.status}</span>
                            )}
                            {l.url && (
                              <span className="text-xs sm:text-sm break-all text-muted-foreground">{l.url}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatTime(l.time)} {l.message ? `• ${l.message}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(pretty(l));
                                toast.success("Copied entry");
                              } catch {
                                toast.error("Failed to copy");
                              }
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toggle(id)}>
                            {expanded[id] ? "Hide" : "Details"}
                          </Button>
                        </div>
                      </div>
                      {expanded[id] && (
                        <pre className="mt-3 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words break-all max-w-full overflow-x-auto">
                          {pretty({ ...l, body: l.body })}
                        </pre>
                      )}
                    </li>
                  );
                })}
                {(!logs || logs.length === 0) && (
                  <li className="px-4 py-8 text-center text-sm text-muted-foreground">No logs yet</li>
                )}
              </ul>
            </ScrollArea>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

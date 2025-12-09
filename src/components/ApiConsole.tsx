import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Copy, Trash2, Terminal, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";

interface ApiConsoleProps {
  logs: { id: string; [key: string]: unknown }[];
  onClear: () => void;
}

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function pretty(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export default function ApiConsole({ logs, onClear }: ApiConsoleProps) {
  const [open, setOpen] = useState(false);
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
    <section aria-label="API Console" className="space-y-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="card-premium rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Terminal className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">API Console</h3>
                <p className="text-xs text-muted-foreground">Debug API requests and responses</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  {summary.reqs}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <ArrowDownLeft className="h-3 w-3" />
                  {summary.res}
                </Badge>
              </div>
              
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hover:bg-primary/10"
                >
                  {open ? "Hide" : "Show"} {count} logs
                  {open ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronRight className="h-4 w-4 ml-2" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="card-premium rounded-xl overflow-hidden animate-in">
            {/* Console Actions */}
            <div className="flex items-center justify-end gap-2 p-3 border-b border-border/50 bg-card/50">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyAll}
                className="h-8 text-xs hover:bg-primary/10"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy All
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClear}
                className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear
              </Button>
            </div>
            
            {/* Log List */}
            <ScrollArea className="h-80">
              <div className="divide-y divide-border/50">
                {(!logs || logs.length === 0) ? (
                  <div className="px-4 py-12 text-center">
                    <Terminal className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No logs yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">API activity will appear here</p>
                  </div>
                ) : (
                  logs.map((l) => {
                    const id = String(l.id ?? `${l.time ?? Date.now()}-${Math.random()}`);
                    const isReq = l.type === "request";
                    const isRes = l.type === "response";
                    
                    return (
                      <div key={id} className="px-4 py-3 hover:bg-card/50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge 
                                className={`text-xs ${
                                  isReq 
                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                                    : isRes 
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {isReq ? <ArrowUpRight className="h-3 w-3 mr-1" /> : isRes ? <ArrowDownLeft className="h-3 w-3 mr-1" /> : null}
                                {String(l.type || 'log')}
                              </Badge>
                              {l.method && (
                                <span className="text-xs font-mono font-medium text-muted-foreground">
                                  {String(l.method)}
                                </span>
                              )}
                              {l.status && (
                                <span className={`text-xs font-mono ${
                                  Number(l.status) >= 400 ? 'text-red-500' : 'text-green-500'
                                }`}>
                                  {String(l.status)}
                                </span>
                              )}
                            </div>
                            {l.url && (
                              <p className="text-xs text-muted-foreground truncate font-mono">
                                {String(l.url)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground/60">
                              {formatTime(l.time as number)} {l.message ? `• ${String(l.message)}` : ""}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-primary/10"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(pretty(l));
                                  toast.success("Copied entry");
                                } catch {
                                  toast.error("Failed to copy");
                                }
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => toggle(id)}
                              className="h-7 text-xs hover:bg-primary/10"
                            >
                              {expanded[id] ? "Hide" : "Details"}
                            </Button>
                          </div>
                        </div>
                        
                        {expanded[id] && (
                          <pre className="mt-3 p-4 rounded-lg bg-background/50 border border-border/50 text-xs font-mono overflow-x-auto text-muted-foreground">
                            {pretty(l)}
                          </pre>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

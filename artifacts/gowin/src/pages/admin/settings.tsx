import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, RefreshCw, CheckCircle2, AlertTriangle, Clock, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

interface AdminSettings {
  apiKey: string;
  lastSync: string;
  syncStatus: string;
  syncSummary: string;
}

export default function AdminSettings() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const { data: settings, isLoading } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    refetchInterval: 3000,
  });

  const saveKeyMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "API key saved" });
      setNewKey("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/sync-fixtures", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.detail ?? "Sync failed");
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Sync complete",
        description: `${data.imported} new fixtures imported, ${data.updated} updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fixtures"] });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  const isSyncing = syncMutation.isPending || settings?.syncStatus === "syncing";

  const maskedKey = (key: string) =>
    key.length > 10 ? key.slice(0, 6) + "•".repeat(key.length - 10) + key.slice(-4) : key;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage API integrations and data sync</p>
      </div>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-4 h-4" /> AllSportsAPI Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current key display */}
          {settings?.apiKey && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-border">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Key</p>
                <p className="font-mono text-sm break-all">
                  {showKey ? settings.apiKey : maskedKey(settings.apiKey)}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)} className="shrink-0">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newKey" className="text-xs text-muted-foreground uppercase tracking-wider">
              {settings?.apiKey ? "Update API Key" : "Enter API Key"}
            </Label>
            <div className="flex gap-3">
              <Input
                id="newKey"
                placeholder="Paste your AllSportsAPI key here"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="font-mono"
              />
              <Button
                onClick={() => saveKeyMutation.mutate(newKey)}
                disabled={!newKey.trim() || saveKeyMutation.isPending}
                className="shrink-0"
              >
                {saveKeyMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              API keys expire every 30 days. Get yours at{" "}
              <a href="https://allsportsapi.com" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                allsportsapi.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="w-4 h-4" /> Fixture Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Sync</p>
              <p className="font-medium">
                {!settings || settings.lastSync === "never"
                  ? "Never synced"
                  : (() => {
                      try { return format(new Date(settings.lastSync), "PPP p"); }
                      catch { return settings.lastSync; }
                    })()}
              </p>
            </div>
            <div>
              {isSyncing ? (
                <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Syncing…
                </Badge>
              ) : settings?.lastSync === "never" ? (
                <Badge variant="outline" className="text-muted-foreground">Never synced</Badge>
              ) : (
                <Badge className="bg-primary/15 text-primary border-primary/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> Up to date
                </Badge>
              )}
            </div>
          </div>

          {settings?.syncSummary && (
            <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Last result: </span>{settings.syncSummary}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Pulls upcoming fixtures for the next <strong>14 days</strong> from AllSportsAPI and imports them into the platform. Existing fixtures are updated; new ones are created with 1X2 markets.
            </p>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={isSyncing || !settings?.apiKey}
              className="w-full gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing fixtures…" : "Sync Now"}
            </Button>
            {!settings?.apiKey && (
              <p className="text-xs text-amber-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Save an API key first before syncing
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-dashed">
        <CardContent className="pt-5">
          <div className="flex gap-3">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>AllSportsAPI keys rotate every 30 days. When fixtures stop updating:</p>
              <ol className="list-decimal list-inside space-y-0.5 ml-1">
                <li>Get your new key from allsportsapi.com</li>
                <li>Paste it above and click <strong>Save</strong></li>
                <li>Click <strong>Sync Now</strong> to pull fresh data</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

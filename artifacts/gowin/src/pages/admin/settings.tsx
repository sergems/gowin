import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Key, RefreshCw, CheckCircle2, AlertTriangle, Clock,
  Eye, EyeOff, Database, Plug, PlugZap, Unplug, FlaskConical,
  Upload, FileText, Info,
} from "lucide-react";
import { format } from "date-fns";

interface AdminSettings {
  apiKey: string;
  lastSync: string;
  syncStatus: string;
  syncSummary: string;
}

interface DbStatus {
  connected: boolean;
  maskedUrl: string | null;
  label: string | null;
}

export default function AdminSettings() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── API Key state ───────────────────────────────────────────────────────────
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // ── Database connection state ───────────────────────────────────────────────
  const [dbUrl, setDbUrl] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPass, setDbPass] = useState("");
  const [dbLabel, setDbLabel] = useState("");
  const [showDbPass, setShowDbPass] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  // ── SQL Import state ────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSql, setImportSql] = useState<string>("");
  const [importFileName, setImportFileName] = useState<string>("");
  const [importTarget, setImportTarget] = useState<"current" | "custom">("current");
  const [importUrl, setImportUrl] = useState("");
  const [importUser, setImportUser] = useState("");
  const [importPass, setImportPass] = useState("");
  const [showImportPass, setShowImportPass] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: settings } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    refetchInterval: 3000,
  });

  const { data: dbStatus, isLoading: dbLoading } = useQuery<DbStatus>({
    queryKey: ["/api/admin/database"],
    queryFn: async () => {
      const res = await fetch("/api/admin/database", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
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
      toast({ title: "Sync complete", description: `${data.imported} new fixtures imported, ${data.updated} updated.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fixtures"] });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  const testDbMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/database/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: dbUrl, username: dbUser || undefined, password: dbPass || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as { ok: boolean; error?: string };
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.ok) toast({ title: "Connection successful" });
      else toast({ title: "Connection failed", description: data.error, variant: "destructive" });
    },
    onError: (e: any) => {
      setTestResult({ ok: false, error: e.message });
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    },
  });

  const connectDbMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/database/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: dbUrl, username: dbUser || undefined, password: dbPass || undefined, label: dbLabel || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Database connected", description: "Application is now using the new database." });
      setDbUrl(""); setDbUser(""); setDbPass(""); setDbLabel(""); setTestResult(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database"] });
    },
    onError: (e: any) => toast({ title: "Connection failed", description: e.message, variant: "destructive" }),
  });

  const disconnectDbMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/database/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Disconnected", description: "Switched back to the default database." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database"] });
    },
    onError: (e: any) => toast({ title: "Disconnect failed", description: e.message, variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const body: any = { sql: importSql };
      if (importTarget === "custom" && importUrl.trim()) {
        body.url = importUrl.trim();
        if (importUser.trim()) body.username = importUser.trim();
        if (importPass.trim()) body.password = importPass.trim();
      }
      const res = await fetch("/api/admin/database/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Import complete", description: "SQL file was executed successfully." });
      setImportSql(""); setImportFileName(""); setImportUrl(""); setImportUser(""); setImportPass("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const isSyncing = syncMutation.isPending || settings?.syncStatus === "syncing";
  const maskedKey = (key: string) =>
    key.length > 10 ? key.slice(0, 6) + "•".repeat(key.length - 10) + key.slice(-4) : key;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileLoading(true);
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportSql((ev.target?.result as string) ?? "");
      setFileLoading(false);
    };
    reader.onerror = () => {
      toast({ title: "Could not read file", variant: "destructive" });
      setFileLoading(false);
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage API integrations, data sync, and database connection</p>
      </div>

      {/* ── API Key ────────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-4 h-4" /> AllSportsAPI Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Button onClick={() => saveKeyMutation.mutate(newKey)} disabled={!newKey.trim() || saveKeyMutation.isPending} className="shrink-0">
                {saveKeyMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              API keys expire every 30 days. Get yours at{" "}
              <a href="https://allsportsapi.com" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">allsportsapi.com</a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Sync ──────────────────────────────────────────────────────────────── */}
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
                  : (() => { try { return format(new Date(settings.lastSync), "PPP p"); } catch { return settings.lastSync; } })()}
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
              Pulls upcoming fixtures for the next <strong>14 days</strong> from AllSportsAPI and imports them.
            </p>
            <Button onClick={() => syncMutation.mutate()} disabled={isSyncing || !settings?.apiKey} className="w-full gap-2">
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

      {/* ── Database Connection ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="w-4 h-4" /> Database Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current status */}
          {!dbLoading && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Connection</p>
                {dbStatus?.connected ? (
                  <>
                    {dbStatus.label && <p className="font-medium text-sm">{dbStatus.label}</p>}
                    <p className="font-mono text-xs text-muted-foreground break-all">{dbStatus.maskedUrl}</p>
                  </>
                ) : (
                  <p className="font-medium text-sm">Default database (Replit PostgreSQL)</p>
                )}
              </div>
              <div className="ml-3 shrink-0 flex flex-col items-end gap-2">
                {dbStatus?.connected ? (
                  <>
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 flex items-center gap-1.5">
                      <PlugZap className="w-3 h-3" /> Custom DB
                    </Badge>
                    <Button
                      variant="outline" size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                      onClick={() => disconnectDbMutation.mutate()}
                      disabled={disconnectDbMutation.isPending}
                    >
                      <Unplug className="w-3.5 h-3.5" />
                      {disconnectDbMutation.isPending ? "Disconnecting…" : "Disconnect"}
                    </Button>
                  </>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground flex items-center gap-1.5">
                    <Plug className="w-3 h-3" /> Default
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Connect form */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {dbStatus?.connected ? "Switch to a Different Database" : "Connect a Custom Database"}
            </p>
            <div className="space-y-2">
              <Label htmlFor="dbLabel" className="text-xs text-muted-foreground">Label (optional)</Label>
              <Input id="dbLabel" placeholder="e.g. Production DB, Season 2025" value={dbLabel}
                onChange={(e) => { setDbLabel(e.target.value); setTestResult(null); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dbUrl" className="text-xs text-muted-foreground">
                Connection URL <span className="text-destructive">*</span>
              </Label>
              <Input id="dbUrl" placeholder="postgresql://host:5432/dbname" value={dbUrl}
                onChange={(e) => { setDbUrl(e.target.value); setTestResult(null); }}
                className="font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dbUser" className="text-xs text-muted-foreground">Username (optional)</Label>
                <Input id="dbUser" placeholder="postgres" value={dbUser}
                  onChange={(e) => { setDbUser(e.target.value); setTestResult(null); }} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dbPass" className="text-xs text-muted-foreground">Password (optional)</Label>
                <div className="relative">
                  <Input id="dbPass" type={showDbPass ? "text" : "password"} placeholder="••••••••" value={dbPass}
                    onChange={(e) => { setDbPass(e.target.value); setTestResult(null); }}
                    autoComplete="new-password" className="pr-9" />
                  <button type="button" onClick={() => setShowDbPass(!showDbPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showDbPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            {testResult && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                testResult.ok
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}>
                {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                {testResult.ok ? "Connection successful — ready to connect." : testResult.error}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="gap-2" onClick={() => testDbMutation.mutate()}
                disabled={!dbUrl.trim() || testDbMutation.isPending}>
                <FlaskConical className="w-4 h-4" />
                {testDbMutation.isPending ? "Testing…" : "Test Connection"}
              </Button>
              <Button className="flex-1 gap-2" onClick={() => connectDbMutation.mutate()}
                disabled={!dbUrl.trim() || connectDbMutation.isPending}>
                <PlugZap className="w-4 h-4" />
                {connectDbMutation.isPending ? "Connecting…" : "Connect Database"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">
            The target database must use the same schema. Username and password are optional if included in the URL.
            The connection is saved and restored automatically on server restart.
          </p>
        </CardContent>
      </Card>

      {/* ── SQL Import ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="w-4 h-4" /> SQL Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info callout */}
          <div className="flex gap-3 px-3 py-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Recommended workflow for a blank custom database:</p>
              <ol className="list-decimal list-inside space-y-0.5 ml-1">
                <li>Choose <strong>Custom database URL</strong> below and enter the blank DB credentials</li>
                <li>Select your <code>.sql</code> backup file and click <strong>Run Import</strong></li>
                <li>Once complete, go to <strong>Database Connection</strong> above and connect to that DB</li>
                <li>Log in again — your imported users and data will be active</li>
              </ol>
            </div>
          </div>

          {/* Target selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Import Target</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImportTarget("current")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  importTarget === "current"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-accent/20 text-muted-foreground hover:border-border/80"
                }`}
              >
                <Database className="w-4 h-4 shrink-0" />
                <span className="font-medium">Current active DB</span>
              </button>
              <button
                type="button"
                onClick={() => setImportTarget("custom")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  importTarget === "custom"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-accent/20 text-muted-foreground hover:border-border/80"
                }`}
              >
                <Plug className="w-4 h-4 shrink-0" />
                <span className="font-medium">Custom database URL</span>
              </button>
            </div>
          </div>

          {/* Custom URL fields */}
          {importTarget === "custom" && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-accent/10">
              <div className="space-y-2">
                <Label htmlFor="importUrl" className="text-xs text-muted-foreground">
                  Target Connection URL <span className="text-destructive">*</span>
                </Label>
                <Input id="importUrl" placeholder="postgresql://host:5432/dbname" value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)} className="font-mono text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="importUser" className="text-xs text-muted-foreground">Username (optional)</Label>
                  <Input id="importUser" placeholder="postgres" value={importUser}
                    onChange={(e) => setImportUser(e.target.value)} autoComplete="off" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="importPass" className="text-xs text-muted-foreground">Password (optional)</Label>
                  <div className="relative">
                    <Input id="importPass" type={showImportPass ? "text" : "password"} placeholder="••••••••"
                      value={importPass} onChange={(e) => setImportPass(e.target.value)}
                      autoComplete="new-password" className="pr-9" />
                    <button type="button" onClick={() => setShowImportPass(!showImportPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showImportPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* File picker */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">SQL Backup File</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-3 px-4 py-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                ${importFileName ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-accent/30"}`}
            >
              {fileLoading ? (
                <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin shrink-0" />
              ) : importFileName ? (
                <FileText className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                {importFileName ? (
                  <>
                    <p className="text-sm font-medium truncate">{importFileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {importSql ? `${(importSql.length / 1024).toFixed(1)} KB loaded` : "Loading…"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Click to select a <code>.sql</code> file</p>
                    <p className="text-xs text-muted-foreground">pg_dump backups supported</p>
                  </>
                )}
              </div>
              {importFileName && !fileLoading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImportSql(""); setImportFileName("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="ml-auto text-muted-foreground hover:text-foreground text-xs underline shrink-0"
                >
                  Remove
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".sql,.txt" className="hidden" onChange={handleFileSelect} />
          </div>

          {importMutation.isPending && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Executing SQL — this may take a moment for large files…</p>
              <Progress value={undefined} className="h-1.5 animate-pulse" />
            </div>
          )}

          <Button
            className="w-full gap-2"
            onClick={() => importMutation.mutate()}
            disabled={
              !importSql || fileLoading || importMutation.isPending ||
              (importTarget === "custom" && !importUrl.trim())
            }
          >
            <Upload className="w-4 h-4" />
            {importMutation.isPending ? "Running import…" : "Run Import"}
          </Button>

          <p className="text-xs text-muted-foreground border-t pt-3">
            The entire SQL file runs inside a single transaction. If any statement fails the whole import is rolled back,
            leaving the target database unchanged.
          </p>
        </CardContent>
      </Card>

      {/* ── Info ──────────────────────────────────────────────────────────────── */}
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

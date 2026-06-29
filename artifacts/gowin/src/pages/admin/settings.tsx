import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Key, RefreshCw, CheckCircle2, AlertTriangle,
  Eye, EyeOff, Database, Plug, PlugZap, Unplug, FlaskConical,
  Upload, FileText, Info, Download, Mail, Send, ShieldCheck, ShieldOff,
  Globe, Lock, Smartphone, Copy,
} from "lucide-react";
import { format } from "date-fns";

interface AdminSettings {
  apiKey: string;
  lastSync: string;
  syncStatus: string;
  syncSummary: string;
}

interface EmailSettings {
  host: string;
  port: string;
  user: string;
  hasPass: boolean;
  secure: boolean;
  from: string;
  appUrl: string;
  configured: boolean;
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
  const { currency: activeCurrency, language: activeLanguage } = useSiteSettings();

  // ── Site Settings state ─────────────────────────────────────────────────────
  const [siteCurrency, setSiteCurrency] = useState(activeCurrency);
  const [siteLanguage, setSiteLanguage] = useState(activeLanguage);

  // ── JWT Secret state ────────────────────────────────────────────────────────
  const [jwtSecretInput, setJwtSecretInput] = useState("");
  const [showJwtSecret, setShowJwtSecret] = useState(false);

  // ── API Key state ───────────────────────────────────────────────────────────
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // ── SMTP / Email state ───────────────────────────────────────────────────────
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpFrom, setSmtpFrom] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [smtpLoaded, setSmtpLoaded] = useState(false);

  // ── Database connection state ───────────────────────────────────────────────
  const [dbUrl, setDbUrl] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPass, setDbPass] = useState("");
  const [dbLabel, setDbLabel] = useState("");
  const [showDbPass, setShowDbPass] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  // ── Export state ────────────────────────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch("/api/admin/database/export", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(data.error ?? "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `gowin-backup-${new Date().toISOString().slice(0, 10)}.sql`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Backup downloaded", description: filename });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }

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

  const { data: jwtStatus } = useQuery<{ isSet: boolean }>({
    queryKey: ["/api/admin/jwt-secret"],
    queryFn: async () => {
      const res = await fetch("/api/admin/jwt-secret", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
  });

  const { data: emailSettings } = useQuery<EmailSettings>({
    queryKey: ["/api/admin/email-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/email-settings", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
  });

  useEffect(() => {
    if (emailSettings && !smtpLoaded) {
      setSmtpHost(emailSettings.host);
      setSmtpPort(emailSettings.port || "587");
      setSmtpUser(emailSettings.user);
      setSmtpPass(emailSettings.hasPass ? "••••••••" : "");
      setSmtpSecure(emailSettings.secure);
      setSmtpFrom(emailSettings.from);
      setAppUrl(emailSettings.appUrl);
      setSmtpLoaded(true);
    }
  }, [emailSettings, smtpLoaded]);

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
  const saveJwtSecretMutation = useMutation({
    mutationFn: async (secret: string) => {
      const res = await fetch("/api/admin/jwt-secret", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Secret JWT enregistré", description: "Le secret a été mis à jour en mémoire et en base de données." });
      setJwtSecretInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jwt-secret"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
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

  const saveEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/email-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass,
          secure: smtpSecure, from: smtpFrom, appUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Email settings saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-settings"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/email-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: testEmailTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => toast({ title: "Test email sent", description: `Check inbox at ${testEmailTo}` }),
    onError: (e: any) => toast({ title: "Test failed", description: e.message, variant: "destructive" }),
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

  // ── Site Settings mutation ──────────────────────────────────────────────────
  const saveSiteSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currency: siteCurrency, language: siteLanguage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Site settings saved", description: "Currency and language updated site-wide." });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
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

      {/* ── Site Settings ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4" /> Site Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Currency</Label>
              <select
                value={siteCurrency}
                onChange={(e) => setSiteCurrency(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Language</Label>
              <div className="flex gap-2 pt-1">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSiteLanguage(lang.code as "en" | "fr")}
                    className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-colors ${
                      siteLanguage === lang.code
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-accent/50 text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {lang.flag} {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button
            onClick={() => saveSiteSettingsMutation.mutate()}
            disabled={saveSiteSettingsMutation.isPending}
            className="w-full gap-2"
          >
            {saveSiteSettingsMutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : "Save Site Settings"}
          </Button>
        </CardContent>
      </Card>

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

      {/* ── JWT Secret ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="w-4 h-4" /> Secret JWT (Authentification)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Statut</p>
              <p className="text-sm font-medium">
                {jwtStatus?.isSet ? "Secret configuré" : "Non configuré"}
              </p>
            </div>
            {jwtStatus?.isSet ? (
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Actif
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-500 border-amber-500/40 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Requis
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="jwtSecret" className="text-xs text-muted-foreground uppercase tracking-wider">
              {jwtStatus?.isSet ? "Mettre à jour le secret" : "Définir le secret JWT"}
            </Label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  id="jwtSecret"
                  type={showJwtSecret ? "text" : "password"}
                  placeholder="Minimum 16 caractères"
                  value={jwtSecretInput}
                  onChange={(e) => setJwtSecretInput(e.target.value)}
                  className="font-mono pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setShowJwtSecret(!showJwtSecret)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                >
                  {showJwtSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                onClick={() => saveJwtSecretMutation.mutate(jwtSecretInput)}
                disabled={jwtSecretInput.trim().length < 16 || saveJwtSecretMutation.isPending}
                className="shrink-0"
              >
                {saveJwtSecretMutation.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Clé secrète utilisée pour signer et vérifier les tokens JWT. Modifiez-la uniquement si nécessaire — cela invalide toutes les sessions actives.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Email / SMTP ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4" /> Email Settings (SMTP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status banner */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email Status</p>
              <p className="text-sm font-medium">
                {emailSettings?.configured ? "Email notifications active" : "Not configured"}
              </p>
            </div>
            {emailSettings?.configured ? (
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground flex items-center gap-1.5">
                <ShieldOff className="w-3 h-3" /> Inactive
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="smtpHost" className="text-xs text-muted-foreground">
                SMTP Host <span className="text-destructive">*</span>
              </Label>
              <Input id="smtpHost" placeholder="smtp.gmail.com" value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort" className="text-xs text-muted-foreground">Port</Label>
              <Input id="smtpPort" placeholder="587" value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)} className="font-mono" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpUser" className="text-xs text-muted-foreground">
              Username / Email <span className="text-destructive">*</span>
            </Label>
            <Input id="smtpUser" placeholder="noreply@yourdomain.com" value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)} autoComplete="off" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpPass" className="text-xs text-muted-foreground">
              Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input id="smtpPass" type={showSmtpPass ? "text" : "password"}
                placeholder={emailSettings?.hasPass ? "Leave unchanged" : "App password or SMTP password"}
                value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)}
                autoComplete="new-password" className="pr-9" />
              <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showSmtpPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/10">
            <div>
              <p className="text-sm font-medium">Use SSL/TLS</p>
              <p className="text-xs text-muted-foreground">Enable for port 465. Leave off for 587 (STARTTLS).</p>
            </div>
            <Switch checked={smtpSecure} onCheckedChange={setSmtpSecure} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpFrom" className="text-xs text-muted-foreground">From Address</Label>
            <Input id="smtpFrom" placeholder='GoWin <noreply@yourdomain.com>' value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appUrl" className="text-xs text-muted-foreground">App URL</Label>
            <Input id="appUrl" placeholder="https://yourdomain.com" value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)} className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">
              Used in password reset links sent to users.
            </p>
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => saveEmailMutation.mutate()}
            disabled={!smtpHost.trim() || !smtpUser.trim() || saveEmailMutation.isPending}
          >
            {saveEmailMutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : "Save Email Settings"}
          </Button>

          {/* Test email */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Send Test Email</p>
            <div className="flex gap-2">
              <Input
                placeholder="recipient@example.com"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                className="gap-2 shrink-0"
                onClick={() => testEmailMutation.mutate()}
                disabled={!testEmailTo.trim() || !emailSettings?.configured || testEmailMutation.isPending}
              >
                <Send className="w-4 h-4" />
                {testEmailMutation.isPending ? "Sending…" : "Send Test"}
              </Button>
            </div>
            {!emailSettings?.configured && (
              <p className="text-xs text-amber-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Save SMTP settings first before sending a test
              </p>
            )}
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

      {/* ── Export ──────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="w-4 h-4" /> Export Database Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Downloads the currently active database as a <code>.sql</code> file generated by{" "}
            <code>pg_dump</code>. You can use this file to restore or migrate your data at any time.
          </p>
          <Button className="w-full gap-2" onClick={handleExport} disabled={isExporting}>
            {isExporting
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating backup…</>
              : <><Download className="w-4 h-4" /> Download SQL Backup</>}
          </Button>
          <p className="text-xs text-muted-foreground border-t pt-3">
            The backup includes all tables, data, and sequences. It is compatible with the{" "}
            <strong>SQL Import</strong> section above — you can restore it to any blank PostgreSQL database.
          </p>
        </CardContent>
      </Card>

      {/* ── PawaPay Settings ──────────────────────────────────────────────────── */}
      <PawapaySettingsCard token={token} />

    </div>
  );
}

// ── PawaPay Settings Card ─────────────────────────────────────────────────────

function PawapaySettingsCard({ token }: { token: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [ppToken, setPpToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [isSandbox, setIsSandbox] = useState(true);
  const [depositsEnabled, setDepositsEnabled] = useState(true);
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(true);
  const [minDeposit, setMinDeposit] = useState("1");
  const [maxDeposit, setMaxDeposit] = useState("10000");
  const [minWithdrawal, setMinWithdrawal] = useState("1");
  const [maxWithdrawal, setMaxWithdrawal] = useState("10000");
  const [loaded, setLoaded] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // ── Sandbox test state ───────────────────────────────────────────────────────
  const [testOperator, setTestOperator] = useState("VODACOM_MPESA_COD");
  const [testPhone, setTestPhone] = useState("");
  const [testAmount, setTestAmount] = useState("5");
  const [testCurrency, setTestCurrency] = useState("USD");
  const [testResult, setTestResult] = useState<any>(null);
  const [finalStatus, setFinalStatus] = useState<any>(null);
  const [pollCountdown, setPollCountdown] = useState<number | null>(null);

  const copyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(label);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const { data: ppSettings, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/pawapay/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/pawapay/settings", { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
  });

  useEffect(() => {
    if (ppSettings && !loaded) {
      setEnabled(ppSettings.enabled ?? true);
      setIsSandbox(ppSettings.isSandbox ?? true);
      setDepositsEnabled(ppSettings.depositsEnabled ?? true);
      setWithdrawalsEnabled(ppSettings.withdrawalsEnabled ?? true);
      setMinDeposit(ppSettings.minDeposit ?? "1");
      setMaxDeposit(ppSettings.maxDeposit ?? "10000");
      setMinWithdrawal(ppSettings.minWithdrawal ?? "1");
      setMaxWithdrawal(ppSettings.maxWithdrawal ?? "10000");
      setLoaded(true);
    }
  }, [ppSettings, loaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        enabled,
        isSandbox,
        depositsEnabled,
        withdrawalsEnabled,
        minDeposit,
        maxDeposit,
        minWithdrawal,
        maxWithdrawal,
      };
      if (ppToken.trim()) body.apiToken = ppToken.trim();
      const res = await fetch("/api/admin/pawapay/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: () => {
      toast({ title: "PawaPay settings saved" });
      setPpToken("");
      setLoaded(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pawapay/settings"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/pawapay/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: testPhone, operator: testOperator, amount: testAmount, currency: testCurrency }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: (d) => {
      setTestResult(d);
      setFinalStatus(null);
      if (d.pawapayStatus === "ACCEPTED") {
        setPollCountdown(5);
      }
      toast({
        title: d.ok ? "Test deposit sent — checking final status…" : "Test deposit rejected",
        description: `Initial status: ${d.pawapayStatus ?? "—"} | HTTP ${d.httpStatus}`,
        variant: d.ok ? "default" : "destructive",
      });
    },
    onError: (e: any) => {
      setTestResult({ error: e.message });
      setFinalStatus(null);
      setPollCountdown(null);
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    },
  });

  const pollStatusMutation = useMutation({
    mutationFn: async (depositId: string) => {
      const res = await fetch(`/api/admin/pawapay/test/${depositId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: (d) => {
      setFinalStatus(d);
      setPollCountdown(null);
    },
    onError: () => setPollCountdown(null),
  });

  useEffect(() => {
    if (pollCountdown === null) return;
    if (pollCountdown === 0) {
      if (testResult?.depositId) pollStatusMutation.mutate(testResult.depositId);
      return;
    }
    const t = setTimeout(() => setPollCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [pollCountdown, testResult?.depositId]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> PawaPay Mobile Money
          </span>
          {ppSettings && (
            <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${
              !ppSettings.enabled
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : ppSettings.isSandbox
                  ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                  : "bg-primary/15 text-primary border-primary/30"
            }`}>
              {!ppSettings.enabled ? "DISABLED" : ppSettings.isSandbox ? "SANDBOX" : "LIVE"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="h-8 bg-accent/50 rounded animate-pulse" />
        ) : (
          <>
            {/* ── Master Enable Toggle ──────────────────────────────────── */}
            <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
              enabled ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"
            }`}>
              <div>
                <p className="text-sm font-bold">{enabled ? "PawaPay is Enabled" : "PawaPay is Disabled"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {enabled
                    ? "Users can deposit and withdraw via mobile money"
                    : "All mobile money payments are blocked for all users"}
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* ── Step 1: Callback URLs ─────────────────────────────────── */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">1</span>
                <div>
                  <p className="text-sm font-semibold text-amber-400">Configure Callback URLs in PawaPay first</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Enter these URLs in <strong>PawaPay Dashboard → Developer → Callback URLs</strong> before generating your API token.</p>
                </div>
              </div>
              {(["Deposits", "Payouts", "Refunds"] as const).map((label) => {
                const url = `${ppSettings?.appUrl || window.location.origin}/api/pawapay/webhook`;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-20 text-xs text-muted-foreground flex-shrink-0">{label}</span>
                    <code className="flex-1 text-xs bg-accent/50 border border-border rounded px-2 py-1.5 font-mono truncate">{url}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-7 w-7"
                      onClick={() => copyUrl(url, label)}
                      title={`Copy ${label} URL`}
                    >
                      {copiedUrl === label
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                );
              })}
              {!ppSettings?.appUrl && (
                <p className="text-xs text-amber-400/80">
                  Set your <strong>App URL</strong> in the Email/SMTP settings above so the full URL appears here.
                </p>
              )}
            </div>

            {/* ── Step 2: API Token ─────────────────────────────────────── */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">API Token</p>
                <p className="text-sm font-medium">
                  {ppSettings?.hasToken
                    ? <span className="text-primary font-semibold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Configured</span>
                    : <span className="text-muted-foreground">Not set</span>}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                {ppSettings?.hasToken ? "Update API Token" : "Set API Token"}
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="Bearer token from PawaPay dashboard"
                  value={ppToken}
                  onChange={(e) => setPpToken(e.target.value)}
                  className="font-mono"
                />
                <Button variant="ghost" size="icon" onClick={() => setShowToken((v) => !v)}>
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-xs font-semibold">Sandbox Mode</p>
                  <p className="text-xs text-muted-foreground">Use test environment</p>
                </div>
                <Switch checked={isSandbox} onCheckedChange={setIsSandbox} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-xs font-semibold">Deposits</p>
                  <p className="text-xs text-muted-foreground">Allow mobile deposits</p>
                </div>
                <Switch checked={depositsEnabled} onCheckedChange={setDepositsEnabled} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-xs font-semibold">Withdrawals</p>
                  <p className="text-xs text-muted-foreground">Allow mobile payouts</p>
                </div>
                <Switch checked={withdrawalsEnabled} onCheckedChange={setWithdrawalsEnabled} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Min Deposit</Label>
                <Input type="number" value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max Deposit</Label>
                <Input type="number" value={maxDeposit} onChange={(e) => setMaxDeposit(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Min Withdrawal</Label>
                <Input type="number" value={minWithdrawal} onChange={(e) => setMinWithdrawal(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max Withdrawal</Label>
                <Input type="number" value={maxWithdrawal} onChange={(e) => setMaxWithdrawal(e.target.value)} />
              </div>
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
              {saveMutation.isPending ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save PawaPay Settings"}
            </Button>

            <p className="text-xs text-muted-foreground border-t pt-3">
              Get your API token from <strong>PawaPay Dashboard → Developer → API Tokens</strong> after configuring the callback URLs above. Keep Sandbox Mode on until you're ready for production.
            </p>

            {/* ── Sandbox Test Panel (only in sandbox mode) ─────────────── */}
            {isSandbox && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-semibold text-amber-400">Sandbox Test Panel</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fire a real API call to the PawaPay sandbox. No real money involved.
                </p>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Operator (DRC)</Label>
                  <select
                    value={testOperator}
                    onChange={(e) => { setTestOperator(e.target.value); setTestPhone(""); }}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="VODACOM_MPESA_COD">M-Pesa (Vodacom)</option>
                    <option value="AIRTEL_COD">Airtel Money</option>
                    <option value="ORANGE_COD">Orange Money</option>
                  </select>
                </div>

                {/* DRC sandbox quick-fill numbers */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">DRC Sandbox Quick-fill</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(testOperator === "VODACOM_MPESA_COD" ? [
                      { phone: "243813456789", label: "✅ COMPLETED" },
                      { phone: "243813456129", label: "⏳ SUBMITTED" },
                      { phone: "243813456039", label: "❌ NOT APPROVED" },
                      { phone: "243813456049", label: "❌ NO BALANCE" },
                    ] : testOperator === "AIRTEL_COD" ? [
                      { phone: "243973456789", label: "✅ COMPLETED" },
                      { phone: "243973456129", label: "⏳ SUBMITTED" },
                      { phone: "243973456069", label: "❌ FAILED" },
                    ] : [
                      { phone: "243893456789", label: "✅ COMPLETED" },
                      { phone: "243893456129", label: "⏳ SUBMITTED" },
                      { phone: "243893456039", label: "❌ NOT APPROVED" },
                      { phone: "243893456049", label: "❌ NO BALANCE" },
                    ]).map(({ phone, label }) => (
                      <button
                        key={phone}
                        type="button"
                        onClick={() => setTestPhone(phone)}
                        className={`px-2 py-1 rounded text-xs border transition-colors font-mono ${
                          testPhone === phone
                            ? "bg-amber-500/20 border-amber-500/60 text-amber-400"
                            : "bg-background border-border text-muted-foreground hover:border-amber-500/40 hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phone number (MSISDN)</Label>
                  <Input
                    type="tel"
                    placeholder="e.g. 243813456789"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ""))}
                    className="font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Amount</Label>
                    <Input type="number" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} min="1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Currency</Label>
                    <select
                      value={testCurrency}
                      onChange={(e) => setTestCurrency(e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="USD">USD</option>
                      <option value="CDF">CDF</option>
                    </select>
                  </div>
                </div>

                <Button
                  onClick={() => { setTestResult(null); testMutation.mutate(); }}
                  disabled={testMutation.isPending || !ppSettings?.hasToken}
                  variant="outline"
                  className="w-full gap-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                >
                  {testMutation.isPending
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending test deposit…</>
                    : <><FlaskConical className="w-4 h-4" /> Run Test Deposit</>}
                </Button>
                {!ppSettings?.hasToken && (
                  <p className="text-xs text-destructive text-center">Configure an API token above before testing.</p>
                )}

                {testResult && (
                  <div className={`rounded-lg border p-3 space-y-2 text-xs ${
                    testResult.error
                      ? "border-destructive/30 bg-destructive/5"
                      : testResult.ok
                        ? "border-primary/30 bg-primary/5"
                        : "border-amber-500/30 bg-amber-500/5"
                  }`}>
                    {testResult.error ? (
                      <p className="text-destructive font-semibold">Error: {testResult.error}</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">
                            {testResult.ok ? "✅ Accepted" : "❌ Rejected"}
                          </span>
                          <span className="text-muted-foreground">HTTP {testResult.httpStatus}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <span className="text-muted-foreground">PawaPay Status</span>
                          <span className="font-mono font-semibold">{testResult.pawapayStatus ?? "—"}</span>
                          <span className="text-muted-foreground">Deposit ID</span>
                          <span className="font-mono truncate">{testResult.depositId}</span>
                          <span className="text-muted-foreground">Operator</span>
                          <span className="font-mono">{testResult.operator}</span>
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-mono">{testResult.amount} {testResult.currency}</span>
                        </div>
                        {testResult.response && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw response</summary>
                            <pre className="mt-2 p-2 bg-background/60 rounded text-[10px] overflow-auto max-h-40 whitespace-pre-wrap">
                              {JSON.stringify(testResult.response, null, 2)}
                            </pre>
                          </details>
                        )}
                        {testResult.pawapayStatus === "ACCEPTED" && (
                          <div className="border-t border-border pt-2 space-y-2">
                            {pollCountdown !== null ? (
                              <p className="text-amber-400 flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Checking final status in {pollCountdown}s…
                              </p>
                            ) : pollStatusMutation.isPending ? (
                              <p className="text-amber-400 flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Fetching final status from PawaPay…
                              </p>
                            ) : finalStatus ? (
                              (() => {
                                const raw = finalStatus.response;
                                const fs = Array.isArray(raw) ? raw[0] : raw;
                                const finalSt = fs?.status ?? "UNKNOWN";
                                const isComplete = finalSt === "COMPLETED";
                                const isFailed = finalSt === "FAILED";
                                return (
                                  <div className={`rounded-md p-2.5 space-y-1 ${
                                    isComplete ? "bg-green-500/10 border border-green-500/30"
                                    : isFailed ? "bg-destructive/10 border border-destructive/30"
                                    : "bg-accent/30 border border-border"
                                  }`}>
                                    <p className={`font-bold text-sm ${isComplete ? "text-green-400" : isFailed ? "text-destructive" : "text-amber-400"}`}>
                                      Final status: {finalSt}
                                    </p>
                                    {fs?.failureReason && (
                                      <p className="text-destructive font-mono text-xs">
                                        {fs.failureReason.failureCode}: {fs.failureReason.failureMessage}
                                      </p>
                                    )}
                                    {fs?.rejectionReason && (
                                      <p className="text-destructive font-mono text-xs">
                                        {fs.rejectionReason.rejectionCode}: {fs.rejectionReason.rejectionMessage}
                                      </p>
                                    )}
                                    <button
                                      className="text-xs text-muted-foreground hover:text-foreground underline"
                                      onClick={() => pollStatusMutation.mutate(testResult.depositId)}
                                    >
                                      Re-check
                                    </button>
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground flex-1">
                                  ACCEPTED — PawaPay will deliver the final result asynchronously.
                                </p>
                                <button
                                  className="text-xs text-amber-400 underline shrink-0"
                                  onClick={() => pollStatusMutation.mutate(testResult.depositId)}
                                >
                                  Check now
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

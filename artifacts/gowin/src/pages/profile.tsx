import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Lock, CheckCircle, AlertTriangle, Hash, Smartphone, PlusCircle, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const DRC_OPERATORS = [
  { code: "VODACOM_MPESA_COD", name: "M-Pesa (Vodacom)" },
  { code: "AIRTEL_COD",        name: "Airtel Money" },
  { code: "ORANGE_COD",        name: "Orange Money" },
];

function operatorLabel(code: string | null) {
  if (!code) return null;
  return DRC_OPERATORS.find((o) => o.code === code)?.name ?? code.replace(/_/g, " ");
}

interface ProfileData {
  id: number;
  publicId: number | null;
  username: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  mobileOperator: string | null;
  secondaryPhoneNumber: string | null;
  secondaryMobileOperator: string | null;
  createdAt: string;
}

async function fetchProfile(token: string | null): Promise<ProfileData> {
  const res = await fetch("/api/profile", {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch profile");
  return data;
}

async function patchProfile(token: string | null, body: object): Promise<ProfileData> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Update failed");
  return data;
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</Label>
      <div className="relative">
        <Input value={value} disabled className="opacity-70 pr-10" />
        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

export default function Profile() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { t } = useSiteSettings();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSecondary, setIsSavingSecondary] = useState(false);

  // Personal info fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Primary payment account (set once, locked)
  const [phoneNumber, setPhoneNumber] = useState("");
  const [mobileOperator, setMobileOperator] = useState("");

  // Secondary payment account (editable)
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [secondaryOperator, setSecondaryOperator] = useState("");
  const [editingSecondary, setEditingSecondary] = useState(false);

  useEffect(() => {
    fetchProfile(token).then((p) => {
      setProfile(p);
      setFirstName(p.firstName ?? "");
      setLastName(p.lastName ?? "");
      setPhoneNumber(p.phoneNumber ?? "");
      setMobileOperator(p.mobileOperator ?? "");
      setSecondaryPhone(p.secondaryPhoneNumber ?? "");
      setSecondaryOperator(p.secondaryMobileOperator ?? "");
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updates: Record<string, string> = {};

      if (!profile.firstName && firstName.trim()) updates.firstName = firstName.trim();
      if (!profile.lastName && lastName.trim()) updates.lastName = lastName.trim();

      // Primary payment account — both must be provided together
      if (!profile.phoneNumber) {
        if (phoneNumber.trim() || mobileOperator.trim()) {
          if (!phoneNumber.trim()) {
            toast({ title: "Phone required", description: "Enter your phone number to set your primary payment account.", variant: "destructive" });
            setIsSaving(false);
            return;
          }
          if (!mobileOperator.trim()) {
            toast({ title: "Operator required", description: "Select your mobile operator to set your primary payment account.", variant: "destructive" });
            setIsSaving(false);
            return;
          }
          updates.phoneNumber = phoneNumber.trim();
          updates.mobileOperator = mobileOperator.trim();
        }
      }

      if (Object.keys(updates).length === 0) {
        toast({ title: t("profile.no_changes") });
        setIsSaving(false);
        return;
      }

      const updated = await patchProfile(token, updates);
      setProfile(updated);
      setFirstName(updated.firstName ?? "");
      setLastName(updated.lastName ?? "");
      setPhoneNumber(updated.phoneNumber ?? "");
      setMobileOperator(updated.mobileOperator ?? "");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: t("profile.updated"), description: t("profile.saved"), variant: "success" });
    } catch (e: any) {
      toast({ title: t("profile.update_failed"), description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecondary = async () => {
    if (!profile) return;
    setIsSavingSecondary(true);
    try {
      const updates: Record<string, string | null> = {
        secondaryPhoneNumber: secondaryPhone.trim() || null,
        secondaryMobileOperator: secondaryOperator.trim() || null,
      };

      if (secondaryPhone.trim() && !secondaryOperator.trim()) {
        toast({ title: "Operator required", description: "Select the operator for your secondary account.", variant: "destructive" });
        setIsSavingSecondary(false);
        return;
      }

      const updated = await patchProfile(token, updates);
      setProfile(updated);
      setSecondaryPhone(updated.secondaryPhoneNumber ?? "");
      setSecondaryOperator(updated.secondaryMobileOperator ?? "");
      setEditingSecondary(false);
      toast({ title: "Secondary account updated", variant: "success" });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSavingSecondary(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-accent/40 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const firstNameLocked = !!profile?.firstName;
  const lastNameLocked = !!profile?.lastName;
  const primaryLocked = !!profile?.phoneNumber;
  const hasSecondary = !!profile?.secondaryPhoneNumber;
  const profileComplete = !!(profile?.firstName && profile?.lastName && profile?.phoneNumber && profile?.mobileOperator);

  const personalInfoEditable = !firstNameLocked || !lastNameLocked;
  const primaryEditable = !primaryLocked;
  const anythingEditable = personalInfoEditable || primaryEditable;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">{t("profile.title")}</h1>
        <p className="text-muted-foreground">{t("profile.desc")}</p>
      </div>

      {!primaryLocked && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-500">Set your primary payment account</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              You must set your phone number and mobile operator before you can deposit or withdraw funds. This cannot be changed after saving — contact support if needed.
            </p>
          </div>
        </div>
      )}

      {/* ID Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-lg">
              {(profile?.firstName || profile?.username || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">
                {profile?.firstName && profile?.lastName
                  ? `${profile.firstName} ${profile.lastName}`
                  : profile?.username}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mt-0.5">
                <Hash className="w-3 h-3" />
                <span>{profile?.publicId ?? "—"}</span>
              </div>
            </div>
            <Badge variant={profile?.role === "admin" ? "default" : "secondary"} className="capitalize ml-auto">
              {profile?.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4" /> {t("profile.account_info")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <LockedField label={t("common.email")} value={profile?.email ?? ""} />
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("profile.user_id")}</Label>
              <div className="relative">
                <Input value={profile?.publicId?.toString() ?? "—"} disabled className="opacity-70 font-mono pr-10" />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {firstNameLocked ? (
              <LockedField label={t("profile.first_name")} value={profile?.firstName ?? ""} />
            ) : (
              <div>
                <Label htmlFor="firstName" className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {t("profile.first_name")}
                </Label>
                <Input id="firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
            )}
            {lastNameLocked ? (
              <LockedField label={t("profile.last_name")} value={profile?.lastName ?? ""} />
            ) : (
              <div>
                <Label htmlFor="lastName" className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {t("profile.last_name")}
                </Label>
                <Input id="lastName" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            )}
          </div>
          {(firstNameLocked || lastNameLocked) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3 h-3 shrink-0" />
              {t("profile.name_locked")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Primary Payment Account */}
      <Card className={!primaryLocked ? "border-amber-500/40" : "border-primary/20"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="w-4 h-4" />
            Primary Payment Account
            {primaryLocked && (
              <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground ml-auto">
                <Lock className="w-3 h-3" /> Locked — contact support to change
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {primaryLocked ? (
            <>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold font-mono">{profile?.phoneNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    via {operatorLabel(profile?.mobileOperator ?? null) ?? "—"}
                  </p>
                </div>
                <CheckCircle className="w-5 h-5 text-primary ml-auto" />
              </div>
              <p className="text-xs text-muted-foreground">
                All withdrawals are sent to this account. You can add a secondary account below for deposits or alternate payouts.
              </p>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phone Number</Label>
                  <Input
                    type="tel"
                    placeholder="e.g. 243812345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Mobile Operator</Label>
                  <select
                    value={mobileOperator}
                    onChange={(e) => setMobileOperator(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select operator…</option>
                    {DRC_OPERATORS.map((op) => (
                      <option key={op.code} value={op.code}>{op.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-600/90">
                  Both phone number and operator are locked permanently once saved. Make sure they are correct before saving.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Secondary Payment Account */}
      <Card className={hasSecondary ? "border-blue-500/20" : "border-border"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="w-4 h-4 text-blue-400" />
            Secondary Payment Account
            <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
            {hasSecondary && !editingSecondary && (
              <button
                onClick={() => setEditingSecondary(true)}
                className="ml-auto flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasSecondary && !editingSecondary ? (
            <>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold font-mono">{profile?.secondaryPhoneNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    via {operatorLabel(profile?.secondaryMobileOperator ?? null) ?? "—"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You can use this account as an alternative for deposits and withdrawals.
              </p>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phone Number</Label>
                  <Input
                    type="tel"
                    placeholder="e.g. 243812345678"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Mobile Operator</Label>
                  <select
                    value={secondaryOperator}
                    onChange={(e) => setSecondaryOperator(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select operator…</option>
                    {DRC_OPERATORS.map((op) => (
                      <option key={op.code} value={op.code}>{op.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You can update or remove your secondary account at any time.
              </p>
              <div className="flex gap-3">
                <Button onClick={handleSaveSecondary} disabled={isSavingSecondary} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isSavingSecondary ? "Saving…" : hasSecondary ? "Update Secondary" : "Add Secondary Account"}
                </Button>
                {editingSecondary && (
                  <Button
                    size="sm" variant="outline"
                    onClick={() => {
                      setSecondaryPhone(profile?.secondaryPhoneNumber ?? "");
                      setSecondaryOperator(profile?.secondaryMobileOperator ?? "");
                      setEditingSecondary(false);
                    }}
                  >
                    Cancel
                  </Button>
                )}
                {hasSecondary && (
                  <Button
                    size="sm" variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      setIsSavingSecondary(true);
                      try {
                        const updated = await patchProfile(token, { secondaryPhoneNumber: null, secondaryMobileOperator: null });
                        setProfile(updated);
                        setSecondaryPhone("");
                        setSecondaryOperator("");
                        setEditingSecondary(false);
                        toast({ title: "Secondary account removed", variant: "success" });
                      } catch (e: any) {
                        toast({ title: "Failed", description: e.message, variant: "destructive" });
                      } finally {
                        setIsSavingSecondary(false);
                      }
                    }}
                    disabled={isSavingSecondary}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </>
          )}
          {!hasSecondary && !editingSecondary && (
            <button
              onClick={() => setEditingSecondary(true)}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <PlusCircle className="w-4 h-4" /> Add a secondary payment account
            </button>
          )}
        </CardContent>
      </Card>

      {/* Save personal info + primary account */}
      {anythingEditable && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="px-8">
            {isSaving ? t("common.saving") : t("profile.save")}
          </Button>
          {profileComplete && (
            <span className="flex items-center gap-1.5 text-sm text-primary">
              <CheckCircle className="w-4 h-4" /> {t("profile.complete")}
            </span>
          )}
        </div>
      )}

      {profileComplete && !anythingEditable && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle className="w-4 h-4" /> {t("profile.complete_desc")}
        </div>
      )}
    </div>
  );
}

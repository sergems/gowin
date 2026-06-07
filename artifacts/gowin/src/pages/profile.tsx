import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Lock, CheckCircle, AlertTriangle, Hash } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ProfileData {
  id: number;
  publicId: number | null;
  username: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
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

function LockedField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
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
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    fetchProfile(token).then((p) => {
      setProfile(p);
      setFirstName(p.firstName ?? "");
      setLastName(p.lastName ?? "");
      setPhoneNumber(p.phoneNumber ?? "");
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
      if (!profile.phoneNumber && phoneNumber.trim()) updates.phoneNumber = phoneNumber.trim();

      if (Object.keys(updates).length === 0) {
        toast({ title: "No changes to save" });
        setIsSaving(false);
        return;
      }

      const updated = await patchProfile(token, updates);
      setProfile(updated);
      setFirstName(updated.firstName ?? "");
      setLastName(updated.lastName ?? "");
      setPhoneNumber(updated.phoneNumber ?? "");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated", description: "Your profile has been saved." });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
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
  const phoneLocked = !!profile?.phoneNumber;
  const profileComplete = !!(profile?.firstName && profile?.lastName && profile?.phoneNumber);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your account details</p>
      </div>

      {!phoneLocked && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-500">Complete your profile to place bets</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your name and phone number are required before you can place any bets. These can only be set once — contact support if you need to change them.
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
            <User className="w-4 h-4" /> Account Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <LockedField label="Email" value={profile?.email ?? ""} />
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">User ID</Label>
              <div className="relative">
                <Input value={profile?.publicId?.toString() ?? "—"} disabled className="opacity-70 font-mono pr-10" />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {firstNameLocked ? (
              <LockedField label="First Name" value={profile?.firstName ?? ""} />
            ) : (
              <div>
                <Label htmlFor="firstName" className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
            )}
            {lastNameLocked ? (
              <LockedField label="Last Name" value={profile?.lastName ?? ""} />
            ) : (
              <div>
                <Label htmlFor="lastName" className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            )}
          </div>
          {(firstNameLocked || lastNameLocked) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3 h-3 shrink-0" />
              Name is locked. Contact support if you need to change it.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Phone */}
      <Card className={!phoneLocked ? "border-amber-500/40" : "border-primary/20"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="w-4 h-4" />
            Mobile Number
            {phoneLocked && (
              <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground ml-auto">
                <Lock className="w-3 h-3" /> Contact support to change
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Input
              placeholder="+1 234 567 8900"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={phoneLocked}
              className={phoneLocked ? "opacity-70 pr-10" : ""}
            />
            {phoneLocked && (
              <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            )}
          </div>
          {!phoneLocked && (
            <p className="text-xs text-amber-500/90 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              This can only be set once. Make sure it's correct before saving.
            </p>
          )}
        </CardContent>
      </Card>

      {(!firstNameLocked || !lastNameLocked || !phoneLocked) && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="px-8">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          {profileComplete && (
            <span className="flex items-center gap-1.5 text-sm text-primary">
              <CheckCircle className="w-4 h-4" /> Profile complete
            </span>
          )}
        </div>
      )}

      {profileComplete && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle className="w-4 h-4" /> Profile complete — you're all set to place bets
        </div>
      )}
    </div>
  );
}

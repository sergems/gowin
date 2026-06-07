import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ProfileData {
  id: number;
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
      if (firstName !== (profile.firstName ?? "")) updates.firstName = firstName;
      if (lastName !== (profile.lastName ?? "")) updates.lastName = lastName;
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
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-accent/40 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const phoneLocked = !!profile?.phoneNumber;
  const profileComplete = !!(profile?.firstName && profile?.lastName && profile?.phoneNumber);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your account details</p>
      </div>

      {!profile?.phoneNumber && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-500">Phone number required to place bets</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              You must add a mobile number before you can place any bets. This can only be set once — contact support if you need to change it.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" /> Account Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Username</Label>
              <Input value={profile?.username ?? ""} disabled className="opacity-60" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</Label>
              <Input value={profile?.email ?? ""} disabled className="opacity-60" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Role</Label>
            <Badge variant={profile?.role === "admin" ? "default" : "secondary"} className="capitalize">
              {profile?.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className={!phoneLocked ? "border-amber-500/40" : "border-primary/20"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Mobile Number
            {phoneLocked && (
              <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground ml-auto">
                <Lock className="w-3 h-3" /> Locked — contact support to change
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
              className={phoneLocked ? "opacity-60 pr-10" : ""}
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
    </div>
  );
}

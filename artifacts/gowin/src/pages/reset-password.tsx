import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

function getEmailFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("email") || "";
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useSiteSettings();

  const [email, setEmail] = useState(getEmailFromUrl);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("reset.invalid_code"));
      setResetToken(data.resetToken);
    } catch (err: any) {
      toast({ title: t("reset.invalid_code"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: t("reset.mismatch_title"), description: t("reset.mismatch_desc"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("reset.failed"));
      setDone(true);
    } catch (err: any) {
      toast({ title: t("reset.failed"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">GoWin</CardTitle>
          <CardDescription>
            {done ? t("reset.done_title") : resetToken ? t("reset.set_password_title") : t("reset.enter_code")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("reset.done_desc")}
              </p>
              <Button className="w-full" onClick={() => setLocation("/login")}>
                {t("reset.go_to_login")}
              </Button>
            </div>
          ) : resetToken ? (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("reset.set_password_instruction")}</p>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("reset.new_password")}</Label>
                <PasswordInput
                  id="newPassword"
                  placeholder={t("reset.new_password_ph")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("reset.confirm_password")}</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder={t("reset.confirm_password_ph")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("reset.saving") : t("reset.set_btn")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("reset.instruction")}
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">{t("reset.email_label")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">{t("reset.code_label")}</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? t("reset.verifying") : t("reset.verify")}
              </Button>
              <Link href="/forgot-password">
                <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" /> {t("reset.request_new")}
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

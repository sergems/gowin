import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Lock, ShieldOff } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [lockedError, setLockedError] = useState(false);
  const [inlineError, setInlineError] = useState<{ icon: "alert" | "shield"; message: string } | null>(null);
  const { t } = useSiteSettings();

  function clearError() {
    setInlineError(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockedError(false);
    setInlineError(null);
    try {
      const result = await login({ identifier, password });
      if (result?.mustChangePassword) {
        setLocation("/change-password");
      } else {
        setLocation("/");
      }
    } catch (err: any) {
      const code = err?.data?.code;
      if (code === "account_locked") {
        setLockedError(true);
        return;
      }
      if (code === "account_disabled_admin") {
        setInlineError({ icon: "shield", message: t("auth.suspended") });
        return;
      }
      setInlineError({ icon: "alert", message: t("auth.invalid_credentials") });
    }
  };

  // For the "forgot password" link, pass the value only if it looks like an email
  const forgotPasswordHref = identifier.includes("@")
    ? `/forgot-password?email=${encodeURIComponent(identifier)}`
    : "/forgot-password";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">GoWin</CardTitle>
          <CardDescription>{t("auth.login_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {lockedError ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <Lock className="w-8 h-8 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">{t("auth.account_locked")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("auth.account_locked_desc")}</p>
                </div>
              </div>
              <Link href={forgotPasswordHref}>
                <Button className="w-full">{t("auth.reset_password")}</Button>
              </Link>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground underline"
                onClick={() => setLockedError(false)}
              >
                {t("auth.try_again")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Phone number or Email</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="07xxxxxxxx or email@example.com"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); clearError(); }}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("common.password")}</Label>
                  <Link href={forgotPasswordHref} className="text-xs text-primary hover:underline">
                    {t("auth.forgot_password")}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? t("auth.signing_in") : t("auth.sign_in")}
              </Button>

              {inlineError && (
                <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  {inlineError.icon === "shield"
                    ? <ShieldOff className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    : <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
                  <p className="text-sm text-destructive leading-snug">{inlineError.message}</p>
                </div>
              )}

              <div className="text-center text-sm">
                {t("auth.no_account")}{" "}
                <Link href="/register" className="text-primary hover:underline">
                  {t("auth.register")}
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Lock, ShieldOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [lockedError, setLockedError] = useState(false);
  const [inlineError, setInlineError] = useState<{ icon: "alert" | "shield"; message: string } | null>(null);

  function clearError() {
    setInlineError(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockedError(false);
    setInlineError(null);
    try {
      const result = await login({ email, password });
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
        setInlineError({
          icon: "shield",
          message: "Your account has been suspended by an administrator. Please contact support.",
        });
        return;
      }
      setInlineError({
        icon: "alert",
        message: "The email or password you entered is incorrect. Please check your details and try again.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">GoWin</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {lockedError ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <Lock className="w-8 h-8 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Account Locked</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your account has been locked after too many failed login attempts. Reset your password to regain access.
                  </p>
                </div>
              </div>
              <Link href={`/forgot-password?email=${encodeURIComponent(email)}`}>
                <Button className="w-full">Reset my password</Button>
              </Link>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground underline"
                onClick={() => setLockedError(false)}
              >
                Try again
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
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
                Don't have an account?{" "}
                <Link href="/register" className="text-primary hover:underline">
                  Register
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const { t } = useSiteSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }
      setSent(true);
    } catch (err: any) {
      toast({ title: t("forgot.error_title"), description: err.message, variant: "destructive" });
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
            {sent ? t("forgot.check_email") : t("forgot.title")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("forgot.sent_desc").replace("{email}", email)}
              </p>
              <Link href={`/reset-password?email=${encodeURIComponent(email)}`}>
                <Button className="w-full">{t("forgot.enter_code_btn")}</Button>
              </Link>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground underline"
                onClick={() => setSent(false)}
              >
                {t("forgot.different_email")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("forgot.instruction")}
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">{t("forgot.email_label")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("forgot.sending") : t("forgot.send_code")}
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" /> {t("forgot.back_to_login")}
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

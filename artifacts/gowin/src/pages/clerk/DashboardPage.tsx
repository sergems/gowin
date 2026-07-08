import { useLocation } from "wouter";
import { LayoutDashboard, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

export default function ClerkDashboard() {
  const [, navigate] = useLocation();
  const { t } = useSiteSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">{t("clerk.title")}</h1>
        <p className="text-muted-foreground">{t("clerk.desc")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/clerk/withdrawals")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-lg">{t("nav.withdrawals")}</p>
              <p className="text-sm text-muted-foreground">{t("clerk.withdrawals_desc")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => navigate("/clerk/withdrawals")}>
          <Banknote className="w-4 h-4 mr-2" /> {t("clerk.go_to_withdrawals")}
        </Button>
      </div>
    </div>
  );
}

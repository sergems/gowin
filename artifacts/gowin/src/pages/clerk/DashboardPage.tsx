import { useLocation } from "wouter";
import { LayoutDashboard, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ClerkDashboard() {
  const [, navigate] = useLocation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Payment Clerk</h1>
        <p className="text-muted-foreground">Authorise approved withdrawal payouts via mobile money</p>
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
              <p className="font-bold text-lg">Withdrawals</p>
              <p className="text-sm text-muted-foreground">Review & authorise payouts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => navigate("/clerk/withdrawals")}>
          <Banknote className="w-4 h-4 mr-2" /> Go to Withdrawals
        </Button>
      </div>
    </div>
  );
}

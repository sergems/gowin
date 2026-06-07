import { useState } from "react";
import { useListAllBets, useVoidBet, getListAllBetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminBets() {
  const { data, isLoading } = useListAllBets({
    query: {
      queryKey: ["allBets"]
    }
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const voidMutation = useVoidBet();
  
  const bets = data?.bets || [];

  const handleVoid = async (betId: number) => {
    if (!confirm("Are you sure you want to void this bet? The stake will be refunded to the user.")) return;
    
    try {
      await voidMutation.mutateAsync({ id: betId });
      toast({ title: "Bet Voided", description: "Stake has been refunded." });
      queryClient.invalidateQueries({ queryKey: getListAllBetsQueryKey() });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Bets Management</h1>
        <p className="text-muted-foreground">Monitor system-wide betting activity</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-accent/10">
              <TableRow>
                <TableHead>Bet ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Stake</TableHead>
                <TableHead className="text-right">Total Odds</TableHead>
                <TableHead className="text-right">Pot. Win</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : bets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No bets found</TableCell>
                </TableRow>
              ) : (
                bets.map(bet => (
                  <TableRow key={bet.id}>
                    <TableCell className="font-medium">#{bet.id}</TableCell>
                    <TableCell>{bet.user?.username || `User #${bet.userId}`}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(bet.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right font-medium">${bet.stake.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{bet.totalOdds.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-primary">${bet.potentialWin.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        bet.status === "won" ? "default" :
                        bet.status === "lost" ? "destructive" :
                        bet.status === "pending" ? "secondary" : "outline"
                      } className={`uppercase ${bet.status === "won" ? "bg-primary text-primary-foreground" : ""}`}>
                        {bet.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleVoid(bet.id)} 
                        disabled={bet.status !== 'pending' || voidMutation.isPending}
                        className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                      >
                        Void
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

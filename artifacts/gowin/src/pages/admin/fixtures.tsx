import { useState } from "react";
import { useListFixtures, useCreateFixture, useUpdateFixture, useSettleFixture, useListSports, useListLeagues, useListTeams, getListFixturesQueryKey, getGetAdminStatsQueryKey, getGetTopFixturesQueryKey, getListAllBetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, subHours } from "date-fns";

export default function AdminFixtures() {
  const { data: fixturesData, isLoading } = useListFixtures();
  const { data: leaguesData } = useListLeagues();
  const { data: teamsData } = useListTeams();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createMutation = useCreateFixture();
  const updateMutation = useUpdateFixture();
  const settleMutation = useSettleFixture();
  
  const fixtures = fixturesData?.fixtures || [];
  const leagues = leaguesData || [];
  const teams = teamsData || [];

  // Create Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [leagueId, setLeagueId] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [startTime, setStartTime] = useState("");

  // Settle/Update State
  const [selectedFixture, setSelectedFixture] = useState<any>(null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [scoreHome, setScoreHome] = useState("");
  const [scoreAway, setScoreAway] = useState("");
  const [status, setStatus] = useState<any>("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        data: {
          leagueId: parseInt(leagueId),
          homeTeamId: parseInt(homeTeamId),
          awayTeamId: parseInt(awayTeamId),
          startTime: new Date(startTime).toISOString()
        }
      });
      toast({ title: "Fixture Created" });
      queryClient.invalidateQueries({ queryKey: getListFixturesQueryKey() });
      setIsCreateOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFixture) return;
    try {
      if (status === 'finished') {
        await settleMutation.mutateAsync({
          id: selectedFixture.id,
          data: {
            scoreHome: parseInt(scoreHome),
            scoreAway: parseInt(scoreAway)
          }
        });
        toast({ title: "Fixture Settled", description: "Bets have been processed." });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTopFixturesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAllBetsQueryKey() });
      } else {
        await updateMutation.mutateAsync({
          id: selectedFixture.id,
          data: {
            status,
            scoreHome: scoreHome ? parseInt(scoreHome) : undefined,
            scoreAway: scoreAway ? parseInt(scoreAway) : undefined
          }
        });
        toast({ title: "Fixture Updated" });
      }
      queryClient.invalidateQueries({ queryKey: getListFixturesQueryKey() });
      setIsUpdateOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openUpdate = (fixture: any) => {
    setSelectedFixture(fixture);
    setScoreHome(fixture.scoreHome?.toString() || "");
    setScoreAway(fixture.scoreAway?.toString() || "");
    setStatus(fixture.status);
    setIsUpdateOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Fixtures Management</h1>
          <p className="text-muted-foreground">Create, update, and settle fixtures</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create Fixture</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Fixture</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>League</Label>
                <Select value={leagueId} onValueChange={setLeagueId} required>
                  <SelectTrigger><SelectValue placeholder="Select League" /></SelectTrigger>
                  <SelectContent>
                    {leagues.map((l: any) => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Home Team</Label>
                  <Select value={homeTeamId} onValueChange={setHomeTeamId} required>
                    <SelectTrigger><SelectValue placeholder="Home Team" /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Away Team</Label>
                  <Select value={awayTeamId} onValueChange={setAwayTeamId} required>
                    <SelectTrigger><SelectValue placeholder="Away Team" /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                Create Fixture
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-accent/10">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>League</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : fixtures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No fixtures found</TableCell>
                </TableRow>
              ) : (
                fixtures.map(fixture => (
                  <TableRow key={fixture.id}>
                    <TableCell className="font-medium">#{fixture.id}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fixture.league?.name}</TableCell>
                    <TableCell className="font-medium">
                      {fixture.homeTeam?.name} vs {fixture.awayTeam?.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(subHours(new Date(fixture.startTime), 2), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`uppercase ${fixture.status === 'live' ? 'border-primary text-primary' : ''}`}>
                        {fixture.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">
                      {(fixture.status === 'live' || fixture.status === 'finished') && (
                        <span>{fixture.scoreHome ?? '-'} : {fixture.scoreAway ?? '-'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openUpdate(fixture)} disabled={fixture.status === 'finished' || fixture.status === 'cancelled'}>
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Update/Settle Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Fixture #{selectedFixture?.id}</DialogTitle>
          </DialogHeader>
          {selectedFixture && (
            <form onSubmit={handleUpdate} className="space-y-4 pt-4">
              <div className="p-3 bg-accent/20 rounded-md border border-border mb-4 text-center font-bold">
                {selectedFixture.homeTeam?.name} vs {selectedFixture.awayTeam?.name}
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="finished">Finished (Settle)</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {status === 'finished' && (
                  <p className="text-xs text-destructive mt-1">Warning: Setting to finished will automatically settle all bets for this fixture. This action cannot be undone.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Home Score</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    value={scoreHome} 
                    onChange={(e) => setScoreHome(e.target.value)} 
                    required={status === 'finished'} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Away Score</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    value={scoreAway} 
                    onChange={(e) => setScoreAway(e.target.value)} 
                    required={status === 'finished'} 
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" variant={status === 'finished' ? 'destructive' : 'default'} disabled={updateMutation.isPending || settleMutation.isPending}>
                {status === 'finished' ? 'Settle Fixture' : 'Update Fixture'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

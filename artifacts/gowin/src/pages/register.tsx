import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Gift } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import gowinLogo from "@/assets/logo.png";

export default function Register() {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const { register, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const search = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({
        username,
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
        referralCode: referralCode.trim() || undefined,
      });
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Could not create account",
        variant: "destructive",
      });
    }
  };

  const isReferred = referralCode.trim().length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center">
            <img src={gowinLogo} alt="GoWin" className="h-10 w-auto" />
          </div>
          <CardDescription>Create an account to start betting</CardDescription>
          {isReferred && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <Badge variant="secondary" className="gap-1 text-green-600 bg-green-500/10 border-green-500/20">
                <Gift className="h-3 w-3" />
                Referral bonus: $2 welcome credit
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Jean"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Mukeba"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08X XXX XXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                autoComplete="tel"
              />
              <p className="text-xs text-muted-foreground">
                Any DRC format accepted — 08X XXX XXXX, +243…, or 243…
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode">
                Referral Code <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="referralCode"
                placeholder="e.g. AB3KXYZ9"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                maxLength={10}
              />
              {isReferred && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Gift className="h-3 w-3" /> You'll receive $2 in bonus credit after sign up
                </p>
              )}
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

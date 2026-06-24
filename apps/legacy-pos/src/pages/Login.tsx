import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin1234");
  const [error, setError] = useState("");

  useEffect(() => {
    const authed = localStorage.getItem("laundry_dry_wash_auth") === "true";
    if (authed) navigate("/order", { replace: true });
  }, [navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "Admin1234") {
      localStorage.setItem("laundry_dry_wash_auth", "true");
      navigate("/order");
    } else {
      setError("Invalid credentials (hint: admin/admin)");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Seo title="Login | Laundry & Dry Wash POS" description="Sign in to Laundry & Dry Wash POS to create orders and print thermal receipts." canonicalPath="/login" />
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="bg-primary text-primary-foreground rounded-t-lg py-6">
          <CardTitle className="text-center text-2xl md:text-3xl">Laundry & Dry Wash</CardTitle>
          <p className="text-center text-xs md:text-sm opacity-90">Admin Portal Login</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

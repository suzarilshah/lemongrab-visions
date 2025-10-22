import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import CorsSetupAlert from "@/components/CorsSetupAlert";
import logo from "@/assets/logo.svg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCorsAlert, setShowCorsAlert] = useState(false);
  const navigate = useNavigate();

  // Check if we can connect to Appwrite on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await account.get();
      } catch (error: any) {
        if (error?.message === "Failed to fetch" || error?.name === "TypeError") {
          setShowCorsAlert(true);
        }
      }
    };
    checkConnection();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("[Login] Attempting login for:", email);
      await account.createEmailPasswordSession(email, password);
      console.log("[Login] Login successful");
      toast.success("Welcome back!");
      navigate("/");
    } catch (error: any) {
      console.error("[Login] Login error details:", {
        error,
        message: error?.message,
        code: error?.code,
        type: error?.type
      });
      
      // Check if it's a CORS error
      if (error?.message === "Failed to fetch" || error?.name === "TypeError") {
        console.error("[Login] CORS Error detected!");
        console.error("[Login] Current domain:", window.location.origin);
        console.error("[Login] To fix: Go to your Appwrite Console > Settings > Platforms");
        console.error("[Login] Add a new Web Platform with hostname:", window.location.origin);
        
        setShowCorsAlert(true);
        toast.error("Connection Error", {
          description: "Please add your domain to Appwrite CORS settings. Check console for details.",
          duration: 10000
        });
      } else {
        toast.error(error.message || "Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-animate flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(158_64%_52%/0.1)_0%,transparent_50%)]" />
      
      <div className="w-full max-w-md relative z-10 space-y-4">
        {showCorsAlert && <CorsSetupAlert />}
        
        <Card className="glass glow border-primary/20">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="LemonGrab Logo" className="h-16 w-16" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Sign In
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to generate AI videos with Sora-2
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass border-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass border-primary/20"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Need an account? </span>
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

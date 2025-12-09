import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCurrentUser, createSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import logo from "@/assets/logo.svg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          navigate("/");
        }
      } catch {
        // Not logged in, stay on login page
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createSession(email, password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-r-primary/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-aurora" />
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 noise-bg" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
          <div className="animate-in delay-100">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Octo" className="h-10 w-10" />
              <span className="text-2xl font-bold text-gradient">Octo</span>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="animate-in delay-200">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-gradient">Create AI Videos</span>
                <br />
                <span className="text-foreground/80">in seconds.</span>
              </h1>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-md animate-in delay-300">
              Harness the power of Azure OpenAI Sora to generate stunning videos from text descriptions.
            </p>
            
            <div className="flex flex-col gap-4 animate-in delay-400">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Zap className="h-5 w-5" />
                </div>
                <span>Lightning-fast video generation</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span>Powered by Sora 1 & Sora 2 models</span>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground animate-in delay-500">
            <p>Built with Azure OpenAI • Enterprise-grade security</p>
          </div>
        </div>
        
        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-8 animate-in">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img src={logo} alt="Octo" className="h-12 w-12" />
                <span className="text-3xl font-bold text-gradient">Octo</span>
              </div>
              <p className="text-muted-foreground">AI Video Generation Platform</p>
            </div>
            
            {/* Form Card */}
            <div className="card-premium rounded-2xl p-8 space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold">Welcome back</h2>
                <p className="text-muted-foreground">
                  Sign in to continue creating amazing videos
                </p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-premium h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-premium h-12"
                  />
                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="btn-premium w-full h-12 text-base font-semibold text-primary-foreground"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    New to Octo?
                  </span>
                </div>
              </div>
              
              <Link
                to="/signup"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              >
                Create an account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground animate-in delay-300">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Secure
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Enterprise Ready
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                99.9% Uptime
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

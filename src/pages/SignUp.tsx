import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createAccount, createSession, getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, Check, Sparkles, Video, Palette, Clock } from "lucide-react";
import logo from "@/assets/logo.svg";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
        // Not logged in, stay on signup page
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createAccount(email, password, name);
      toast.success("Account created! Logging you in...");
      await createSession(email, password);
      toast.success("Welcome to Octo!");
      navigate("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create account";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Video,
      title: "AI Video Generation",
      description: "Create stunning videos from text in minutes"
    },
    {
      icon: Palette,
      title: "Multiple Styles",
      description: "Support for Sora 1 & Sora 2 models"
    },
    {
      icon: Clock,
      title: "Fast Processing",
      description: "Videos generated in 1-3 minutes"
    }
  ];

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
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
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-8 animate-in">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <img src={logo} alt="Octo" className="h-10 w-10" />
              <span className="text-2xl font-bold text-gradient">Octo</span>
            </div>
            
            {/* Form Card */}
            <div className="card-premium rounded-2xl p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Create your account</h2>
                <p className="text-muted-foreground">
                  Start generating AI videos in seconds
                </p>
              </div>
              
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="input-premium h-12"
                  />
                </div>
                
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
                    minLength={8}
                    className="input-premium h-12"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Check className="h-3 w-3 text-primary" />
                    Minimum 8 characters required
                  </p>
                </div>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="btn-premium w-full h-12 text-base font-semibold text-primary-foreground"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating account...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Get started free
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>
              
              <p className="text-xs text-center text-muted-foreground">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Already have an account?
                  </span>
                </div>
              </div>
              
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              >
                Sign in instead
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
        
        {/* Right Side - Features */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 space-y-12">
          <div className="animate-in delay-100">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              No credit card required
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-foreground">Turn your ideas into</span>
              <br />
              <span className="text-gradient">stunning videos</span>
            </h1>
          </div>
          
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="animate-in flex items-start gap-4 p-4 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30"
                style={{ animationDelay: `${200 + index * 100}ms` }}
              >
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Testimonial or social proof */}
          <div className="animate-in delay-500 p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-purple-500/80 border-2 border-background flex items-center justify-center text-xs font-bold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium">Join 1,000+ creators</p>
                <p className="text-xs text-muted-foreground">using Octo to create videos & movies</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

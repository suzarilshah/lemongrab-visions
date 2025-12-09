import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, ShieldCheck, KeyRound, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.svg";
import { requestPasswordReset, resetPasswordWithToken } from "@/lib/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRequesting(true);
    try {
      const { resetToken: token, expiresAt: exp } = await requestPasswordReset(email);
      setGeneratedToken(token);
      setExpiresAt(exp);
      toast.success("Reset token generated. Copy and use it within 30 minutes.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to request reset token";
      toast.error(message);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsResetting(true);
    try {
      await resetPasswordWithToken(resetToken, newPassword);
      toast.success("Password updated. Please sign in with your new password.");
      navigate("/login");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to reset password";
      toast.error(message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh relative overflow-hidden">
      <div className="absolute inset-0 bg-aurora" />
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 noise-bg" />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8">
          {/* Header */}
          <div className="card-premium rounded-2xl p-8 space-y-4 animate-in">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Octo" className="h-10 w-10" />
              <div>
                <p className="text-sm text-muted-foreground">Security Center</p>
                <h1 className="text-2xl font-bold text-gradient">Reset your password</h1>
              </div>
            </div>
            <p className="text-muted-foreground">
              Generate a one-time reset token (valid for 30 minutes), then use it to set a new password.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Keep your reset token private. Anyone with it can change your password.</span>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" size="sm" asChild className="gap-2">
                <Link to="/login">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Request token */}
            <div className="card-premium rounded-2xl p-6 space-y-4 animate-in delay-75">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">Request reset token</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your account email to generate a one-time reset token.
                  </p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleRequestToken}>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isRequesting}>
                  {isRequesting ? "Generating..." : "Generate reset token"}
                </Button>
              </form>

              {generatedToken && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
                  <p className="text-sm font-medium text-primary">Your reset token</p>
                  <div className="flex items-center justify-between gap-3 bg-background/60 rounded-md px-3 py-2">
                    <code className="text-xs break-all">{generatedToken}</code>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedToken);
                        toast.success("Token copied");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expires at: {expiresAt ? new Date(expiresAt).toLocaleString() : "unknown"}
                  </p>
                </div>
              )}
            </div>

            {/* Reset password */}
            <div className="card-premium rounded-2xl p-6 space-y-4 animate-in delay-150">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">Reset password</h2>
                  <p className="text-sm text-muted-foreground">
                    Paste the token you generated and set a new password.
                  </p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <Label htmlFor="reset-token">Reset token</Label>
                  <Input
                    id="reset-token"
                    type="text"
                    placeholder="Paste your token"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="New password (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isResetting}>
                  {isResetting ? "Resetting..." : "Reset password"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


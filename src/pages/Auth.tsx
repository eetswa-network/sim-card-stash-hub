import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, QrCode, Copy, CheckCircle } from "lucide-react";
import { TOTP } from "otpauth";
import QRCode from "qrcode";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showMfaVerification, setShowMfaVerification] = useState(false);
  const [mfaSecret, setMfaSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [tempUser, setTempUser] = useState(null);
  const [tempCredentials, setTempCredentials] = useState<{email: string, password: string} | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        navigate("/");
      }
    };
    
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
          navigate("/");
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name
          }
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Account already exists",
            description: "Please sign in with your existing account or use a different email.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMfaSecret = () => {
    const totp = new TOTP({
      issuer: "SIM Card Stash",
      label: tempUser?.email || "User",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });
    return totp.secret.base32;
  };

  const generateBackupCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  };

  const setupMfa = async (userId: string, email: string) => {
    const secret = generateMfaSecret();
    const codes = generateBackupCodes();
    
    const totp = new TOTP({
      issuer: "SIM Card Stash",
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret,
    });

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(totp.toString());
      setMfaSecret(secret);
      setQrCodeUrl(qrCodeDataUrl);
      setBackupCodes(codes);
      setShowMfaSetup(true);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast({
        title: "Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive"
      });
    }
  };

  const checkMfaSettings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_mfa_settings")
        .select("is_enabled")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data?.is_enabled || false;
    } catch (error) {
      console.error("Error checking MFA settings:", error);
      return false;
    }
  };

  const saveMfaSettings = async (userId: string, secret: string, codes: string[]) => {
    try {
      const { error } = await supabase
        .from("user_mfa_settings")
        .upsert({
          user_id: userId,
          secret: secret,
          backup_codes: codes,
          is_enabled: true
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving MFA settings:", error);
      throw error;
    }
  };

  const verifyTotp = (secret: string, token: string) => {
    const totp = new TOTP({
      issuer: "SIM Card Stash",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret,
    });

    const currentToken = totp.generate();
    const previousTotp = new TOTP({
      issuer: "SIM Card Stash",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret,
    });
    const previousToken = previousTotp.generate({ timestamp: Date.now() - 30000 });

    return token === currentToken || token === previousToken;
  };

  const handleMfaSetupComplete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const verificationCode = formData.get("verification_code") as string;

    try {
      if (!verifyTotp(mfaSecret, verificationCode)) {
        toast({
          title: "Invalid verification code",
          description: "Please check your authenticator app and try again.",
          variant: "destructive"
        });
        return;
      }

      await saveMfaSettings(tempUser.id, mfaSecret, backupCodes);
      
      // Complete the login by signing in with stored credentials
      if (tempCredentials) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: tempCredentials.email,
          password: tempCredentials.password
        });

        if (signInError) {
          toast({
            title: "Login failed",
            description: "Failed to complete login after MFA setup.",
            variant: "destructive"
          });
          return;
        }
      }
      
      toast({
        title: "Two-step authentication enabled!",
        description: "Your account is now secured with 2FA."
      });

      setShowMfaSetup(false);
      setTempUser(null);
      setTempCredentials(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable two-step authentication. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const verificationCode = formData.get("mfa_code") as string;

    try {
      const { data: mfaData, error } = await supabase
        .from("user_mfa_settings")
        .select("secret, backup_codes")
        .eq("user_id", tempUser.id)
        .single();

      if (error) throw error;

      const isValidTotp = verifyTotp(mfaData.secret, verificationCode);
      const isValidBackupCode = mfaData.backup_codes?.includes(verificationCode);

      if (!isValidTotp && !isValidBackupCode) {
        toast({
          title: "Invalid verification code",
          description: "Please check your code and try again.",
          variant: "destructive"
        });
        return;
      }

      // If backup code was used, remove it from the list
      if (isValidBackupCode) {
        const updatedCodes = mfaData.backup_codes.filter(code => code !== verificationCode);
        await supabase
          .from("user_mfa_settings")
          .update({ backup_codes: updatedCodes })
          .eq("user_id", tempUser.id);
      }

      // Complete the login by signing in again with stored credentials
      if (tempCredentials) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: tempCredentials.email,
          password: tempCredentials.password
        });

        if (signInError) {
          toast({
            title: "Login failed",
            description: "Failed to complete login after MFA verification.",
            variant: "destructive"
          });
          return;
        }
      }

      setShowMfaVerification(false);
      setTempUser(null);
      setTempCredentials(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Backup codes copied!",
      description: "Store these codes in a safe place."
    });
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Sign in failed",
            description: "Invalid email or password. Please check your credentials and try again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive"
          });
        }
      } else if (data.user) {
        // Check if user has MFA enabled
        const mfaEnabled = await checkMfaSettings(data.user.id);
        
        if (mfaEnabled) {
          // Sign out immediately and store credentials for after MFA verification
          await supabase.auth.signOut();
          setTempUser(data.user);
          setTempCredentials({ email, password });
          setShowMfaVerification(true);
        } else {
          // For existing users without MFA, show MFA setup immediately
          await supabase.auth.signOut();
          setTempUser(data.user);
          setTempCredentials({ email, password });
          toast({
            title: "Two-step authentication required",
            description: "Please set up 2FA to secure your account.",
            variant: "destructive"
          });
          await setupMfa(data.user.id, data.user.email);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (showMfaSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Set Up Two-Step Authentication</CardTitle>
            </div>
            <CardDescription>
              Secure your account with an authenticator app like Google Authenticator or Authy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg inline-block">
                <img src={qrCodeUrl} alt="QR Code for 2FA setup" className="w-48 h-48" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Scan this QR code with your authenticator app
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-secret">Or enter this secret manually:</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-secret"
                  value={mfaSecret}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(mfaSecret);
                    toast({ title: "Secret copied to clipboard!" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Backup Codes
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-background p-3 rounded border">
                {backupCodes.map((code, index) => (
                  <div key={index} className="text-center py-1">
                    {code}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyBackupCodes}
                className="w-full mt-3"
              >
                {copied ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Backup Codes
                  </>
                )}
              </Button>
            </div>

            <form onSubmit={handleMfaSetupComplete} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification_code">Enter verification code from your app:</Label>
                <Input
                  id="verification_code"
                  name="verification_code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showMfaVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Two-Step Verification</CardTitle>
            </div>
            <CardDescription>
              Enter the verification code from your authenticator app or use a backup code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMfaVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfa_code">Verification Code</Label>
                <Input
                  id="mfa_code"
                  name="mfa_code"
                  type="text"
                  placeholder="123456 or backup code"
                  required
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Enter 6-digit code from your authenticator app or an 8-character backup code
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowMfaVerification(false);
                  setTempUser(null);
                  setTempCredentials(null);
                }}
              >
                Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to SIM Card Stash</CardTitle>
          <CardDescription>Sign in to your account or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    placeholder="Your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
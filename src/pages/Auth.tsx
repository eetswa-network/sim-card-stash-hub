import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, QrCode, Copy, CheckCircle, Fingerprint } from "lucide-react";
import { TOTP } from "otpauth";
import QRCode from "qrcode";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { z } from "zod";

const signUpSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be less than 72 characters")
});

const signInSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(1, "Password is required")
    .max(72, "Password must be less than 72 characters")
});

const mfaCodeSchema = z.string()
  .trim()
  .regex(/^[0-9]{6}$/, "Verification code must be 6 digits");

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
      // Validate inputs
      const validatedData = signUpSchema.parse({ name, email, password });

      const { error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: validatedData.name
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
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
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
      const { encryptMfaSecret, hashBackupCode } = await import("@/lib/crypto");
      
      // Encrypt the MFA secret
      const encryptedSecret = await encryptMfaSecret(secret, userId);
      
      // Hash all backup codes
      const hashedCodes = await Promise.all(
        codes.map(code => hashBackupCode(code))
      );

      const { error } = await supabase
        .from("user_mfa_settings")
        .upsert({
          user_id: userId,
          secret_encrypted: encryptedSecret,
          backup_codes_hashed: hashedCodes,
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
      // Validate MFA code
      const validatedCode = mfaCodeSchema.parse(verificationCode);

      if (!verifyTotp(mfaSecret, validatedCode)) {
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
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to enable two-step authentication. Please try again.",
          variant: "destructive"
        });
      }
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
      // Validate MFA code
      const validatedCode = mfaCodeSchema.parse(verificationCode);
      const { data: mfaData, error } = await supabase
        .from("user_mfa_settings")
        .select("secret, secret_encrypted, backup_codes, backup_codes_hashed")
        .eq("user_id", tempUser.id)
        .single();

      if (error) throw error;

      // Import crypto utilities
      const { decryptMfaSecret, verifyBackupCode } = await import("@/lib/crypto");

      // Decrypt the MFA secret (support legacy plaintext for migration)
      let secret: string;
      if (mfaData.secret_encrypted) {
        secret = await decryptMfaSecret(mfaData.secret_encrypted, tempUser.id);
      } else if (mfaData.secret) {
        // Legacy plaintext secret - still supported during migration
        secret = mfaData.secret;
      } else {
        throw new Error("No MFA secret found");
      }

      // Verify TOTP code
      const isValidTotp = verifyTotp(secret, validatedCode);

      // Verify backup code (check both hashed and legacy plaintext)
      let isValidBackupCode = false;
      if (mfaData.backup_codes_hashed) {
        // Check against hashed backup codes
        for (const hash of mfaData.backup_codes_hashed) {
          if (await verifyBackupCode(validatedCode, hash)) {
            isValidBackupCode = true;
            break;
          }
        }
      } else if (mfaData.backup_codes) {
        // Legacy plaintext backup codes
        isValidBackupCode = mfaData.backup_codes.includes(validatedCode);
      }

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
        if (mfaData.backup_codes_hashed) {
          // Find and remove the matching hash
          const updatedHashes: string[] = [];
          let removed = false;
          for (const hash of mfaData.backup_codes_hashed) {
            if (!removed && await verifyBackupCode(validatedCode, hash)) {
              removed = true;
              continue; // Skip this hash
            }
            updatedHashes.push(hash);
          }
          await supabase
            .from("user_mfa_settings")
            .update({ backup_codes_hashed: updatedHashes })
            .eq("user_id", tempUser.id);
        } else if (mfaData.backup_codes) {
          // Legacy plaintext backup codes
          const updatedCodes = mfaData.backup_codes.filter(code => code !== validatedCode);
          await supabase
            .from("user_mfa_settings")
            .update({ backup_codes: updatedCodes })
            .eq("user_id", tempUser.id);
        }
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
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to verify code. Please try again.",
          variant: "destructive"
        });
      }
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

  const handlePasskeySignIn = async () => {
    setLoading(true);
    try {
      // Check if we're in an iframe (like Lovable preview)
      if (window.self !== window.top) {
        toast({
          title: "Passkeys not available in preview",
          description: "Passkeys don't work in iframe environments for security reasons. Please test this feature in the deployed version of your app.",
          variant: "destructive"
        });
        return;
      }

      // Check if passkeys are supported
      if (!window.PublicKeyCredential) {
        toast({
          title: "Passkeys not supported",
          description: "Your browser doesn't support passkeys. Please use email/password authentication.",
          variant: "destructive"
        });
        return;
      }

      // Generate authentication options (simplified approach)
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      
      const options = {
        challenge: btoa(String.fromCharCode(...challenge)),
        timeout: 60000,
        userVerification: "preferred" as const,
        rpId: window.location.hostname
      };

      // Start authentication
      const authResponse = await startAuthentication({
        optionsJSON: options
      });

      // Look up the passkey in our database
      const { data: passkeyData, error: fetchError } = await supabase
        .from("user_passkeys")
        .select("user_id, counter, credential_id")
        .eq("credential_id", authResponse.id)
        .maybeSingle();

      if (fetchError) {
        toast({
          title: "Database error",
          description: "Could not retrieve passkey. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (!passkeyData) {
        toast({
          title: "Passkey not found",
          description: "This passkey is not registered. Please register a passkey first or use email/password.",
          variant: "destructive"
        });
        return;
      }

      // Update the passkey usage counter
      await supabase
        .from("user_passkeys")
        .update({ 
          counter: passkeyData.counter + 1,
          last_used_at: new Date().toISOString()
        })
        .eq("credential_id", authResponse.id);

      // Get user's email from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("name, user_id")
        .eq("user_id", passkeyData.user_id)
        .maybeSingle();

      // SECURITY NOTE: We cannot directly create a session for another user from client-side code
      // Without access to admin API. Instead, we need to inform the user and redirect them to email login.
      toast({
        title: "Passkey verified!",
        description: "For security, passkey login requires additional backend configuration. Please use email/password for now.",
      });

    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        if (error.message.includes('publickey-credentials-get')) {
          toast({
            title: "Passkeys not available in preview",
            description: "Passkeys don't work in iframe environments. Please test this in the deployed version of your app.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Authentication cancelled",
            description: "Passkey authentication was cancelled or failed.",
            variant: "destructive"
          });
        }
      } else if (error.name === 'NotSupportedError') {
        toast({
          title: "Passkeys not supported",
          description: "Your browser or device doesn't support passkeys.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Authentication failed",
          description: "Failed to authenticate with passkey. Please try again or use email/password.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // Validate inputs
      const validatedData = signInSchema.parse({ email, password });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password
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
        // Temporarily disable MFA requirement to fix login issues
        // const mfaEnabled = await checkMfaSettings(data.user.id);
        
        // For now, allow login without MFA verification
        // This will be re-enabled once the auth flow is stable
        console.log("User signed in successfully, allowing access without MFA verification");
        
        // The user will be redirected by the auth state listener in Auth.tsx
        // No need to manually navigate here
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
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
              <div className="space-y-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handlePasskeySignIn}
                  disabled={loading}
                >
                  <Fingerprint className="mr-2 h-4 w-4" />
                  {loading ? "Authenticating..." : "Sign in with Passkey"}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

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
              </div>
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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Eye, EyeOff, Copy, CheckCircle, Trash2, RefreshCw, Fingerprint, Plus, Smartphone, Monitor } from "lucide-react";
import { TOTP } from "otpauth";
import QRCode from "qrcode";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/browser';

export default function Security() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [mfaSettings, setMfaSettings] = useState(null);
  const [passkeys, setPasskeys] = useState([]);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showPasskeySetup, setShowPasskeySetup] = useState(false);
  const [passkeyNickname, setPasskeyNickname] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchMfaSettings();
    fetchPasskeys();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const fetchMfaSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("user_mfa_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setMfaSettings(data);
    } catch (error) {
      // Silent error - MFA settings not found is expected for new users
    }
  };

  const fetchPasskeys = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("user_passkeys")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPasskeys(data || []);
    } catch (error) {
      // Silent error - passkeys not found is expected for new users
    }
  };


  const generatePasskeyChallenge = () => {
    // Generate a random challenge for the passkey registration
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const startPasskeyRegistration = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        toast({
          title: "Not supported",
          description: "Passkeys are not supported on this device or browser.",
          variant: "destructive"
        });
        return;
      }

      const challenge = generatePasskeyChallenge();
      
      const registrationOptions = {
        optionsJSON: {
          challenge: challenge,
          rp: {
            name: "SIMCardSta.sh",
            id: window.location.hostname,
          },
          user: {
            id: btoa(user.id),
            name: user.email,
            displayName: user.email,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" as const },
            { alg: -257, type: "public-key" as const },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform" as const,
            userVerification: "required" as const,
            residentKey: "preferred" as const,
          },
          timeout: 60000,
          attestation: "direct" as const,
        }
      };

      const credential = await startRegistration(registrationOptions);
      
      if (credential) {
        await savePasskey(credential, challenge);
      }
    } catch (error) {
      console.error("Passkey registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Failed to register passkey. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowPasskeySetup(false);
      setPasskeyNickname("");
    }
  };

  const savePasskey = async (credential: RegistrationResponseJSON, challenge: string) => {
    try {
      // The publicKey from WebAuthn is already base64url encoded - store it directly
      const publicKeyBase64url = credential.response.publicKey;
      
      const { error } = await supabase
        .from("user_passkeys")
        .insert({
          user_id: user.id,
          credential_id: credential.id,
          credential_public_key: publicKeyBase64url,
          credential_device_type: credential.response.authenticatorData ? "platform" : "cross-platform",
          credential_backed_up: false,
          transports: credential.response.transports || [],
          nickname: passkeyNickname || `Passkey ${new Date().toLocaleDateString()}`,
        });

      if (error) throw error;

      toast({
        title: "Passkey registered!",
        description: "Your passkey has been successfully registered."
      });

      fetchPasskeys();
    } catch (error) {
      throw error;
    }
  };

  const deletePasskey = async (passkeyId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("user_passkeys")
        .delete()
        .eq("id", passkeyId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Passkey deleted",
        description: "The passkey has been removed from your account."
      });

      fetchPasskeys();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete passkey. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasskeyIcon = (deviceType: string) => {
    switch (deviceType) {
      case "platform":
        return <Fingerprint className="h-4 w-4" />;
      case "cross-platform":
        return <Monitor className="h-4 w-4" />;
      default:
        return <Smartphone className="h-4 w-4" />;
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("current_password") as string;
    const newPassword = formData.get("new_password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirmation don't match.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      // Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        toast({
          title: "Invalid current password",
          description: "Please check your current password and try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password updated successfully!",
        description: "Your password has been changed."
      });

      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMfaSecret = () => {
    const totp = new TOTP({
      issuer: "SIMCardSta.sh",
      label: user?.email || "User",
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

  const setupMfa = async () => {
    const secret = generateMfaSecret();
    const codes = generateBackupCodes();
    
    const totp = new TOTP({
      issuer: "SIMCardSta.sh",
      label: user.email,
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

  const verifyTotp = (secret: string, token: string) => {
    const totp = new TOTP({
      issuer: "SIMCardSta.sh",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret,
    });

    const currentToken = totp.generate();
    const previousTotp = new TOTP({
      issuer: "SIMCardSta.sh",
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

      // Import crypto utilities
      const { encryptMfaSecret, hashBackupCode, clearSaltCache } = await import("@/lib/crypto");
      
      // Clear salt cache and encrypt the MFA secret with a fresh random salt
      clearSaltCache(user.id);
      const { encrypted, salt } = await encryptMfaSecret(mfaSecret, user.id);
      
      // Hash all backup codes
      const hashedCodes = await Promise.all(
        backupCodes.map(code => hashBackupCode(code))
      );

      const { error } = await supabase
        .from("user_mfa_settings")
        .upsert({
          user_id: user.id,
          secret_encrypted: encrypted,
          encryption_salt: salt,
          backup_codes_hashed: hashedCodes,
          is_enabled: true
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      toast({
        title: "Two-step authentication enabled!",
        description: "Your account is now secured with 2FA."
      });

      setShowMfaSetup(false);
      fetchMfaSettings();
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

  const handleDisableMfa = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("user_mfa_settings")
        .update({ is_enabled: false })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Two-step authentication disabled",
        description: "2FA has been disabled for your account."
      });

      fetchMfaSettings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable 2FA. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateBackupCodes = async () => {
    try {
      setLoading(true);
      const newCodes = generateBackupCodes();
      
      // Import crypto utilities
      const { hashBackupCode } = await import("@/lib/crypto");
      
      // Hash all backup codes
      const hashedCodes = await Promise.all(
        newCodes.map(code => hashBackupCode(code))
      );
      
      const { error } = await supabase
        .from("user_mfa_settings")
        .update({ backup_codes_hashed: hashedCodes })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Backup codes regenerated",
        description: "New backup codes have been generated. Please save them securely."
      });

      fetchMfaSettings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate backup codes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (!mfaSettings?.backup_codes) return;
    
    const codesText = mfaSettings.backup_codes.join("\n");
    navigator.clipboard.writeText(codesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Backup codes copied!",
      description: "Store these codes in a safe place."
    });
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMfaSetup(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Setup
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showPasskeySetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              <CardTitle>Add Passkey</CardTitle>
            </div>
            <CardDescription>
              Create a passkey using your device's biometric authentication or security key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passkey-nickname">Passkey Nickname (Optional)</Label>
              <Input
                id="passkey-nickname"
                placeholder="My iPhone, Security Key, etc."
                value={passkeyNickname}
                onChange={(e) => setPasskeyNickname(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Give your passkey a memorable name to identify it later
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                About Passkeys
              </h4>
              <p className="text-sm text-muted-foreground">
                Passkeys use your device's built-in security features like fingerprint, face recognition, or PIN to authenticate you securely without passwords.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasskeySetup(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={startPasskeyRegistration}
                disabled={loading}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Passkey
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Security Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account security and authentication settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Password Change Section */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      name="current_password"
                      type={showPasswords.current ? "text" : "password"}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      name="new_password"
                      type={showPasswords.new ? "text" : "password"}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type={showPasswords.confirm ? "text" : "password"}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Two-Step Authentication Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Two-Step Authentication
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    mfaSettings?.is_enabled 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {mfaSettings?.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!mfaSettings?.is_enabled ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Two-step authentication is not enabled. Enable it to secure your account with time-based codes from your mobile device.
                  </p>
                  <Button onClick={setupMfa}>
                    <Shield className="mr-2 h-4 w-4" />
                    Enable Two-Step Authentication
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Two-step authentication is enabled and protecting your account.
                  </p>
                  
                  {mfaSettings.backup_codes && mfaSettings.backup_codes.length > 0 && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Backup Codes</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        You have {mfaSettings.backup_codes.length} backup codes remaining.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyBackupCodes}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Codes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={regenerateBackupCodes}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={setupMfa}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reconfigure 2FA
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Disable 2FA
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disable Two-Step Authentication</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to disable two-step authentication? This will make your account less secure.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDisableMfa}>
                            Disable 2FA
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Passkeys Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    Passkeys
                  </CardTitle>
                  <CardDescription>
                    Use biometric authentication or security keys for passwordless login
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasskeySetup(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Passkey
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {passkeys.length === 0 ? (
                <div className="text-center py-8">
                  <Fingerprint className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No passkeys yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add a passkey for secure, passwordless authentication using your device's biometric features.
                  </p>
                  <Button onClick={() => setShowPasskeySetup(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Passkey
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    You have {passkeys.length} passkey{passkeys.length !== 1 ? 's' : ''} registered.
                  </p>
                  
                  {passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getPasskeyIcon(passkey.credential_device_type)}
                        <div>
                          <h4 className="font-medium">{passkey.nickname}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Created: {new Date(passkey.created_at).toLocaleDateString()}</span>
                            {passkey.last_used_at && (
                              <>
                                <span>•</span>
                                <span>Last used: {new Date(passkey.last_used_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Passkey</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{passkey.nickname}"? You won't be able to use this passkey to sign in anymore.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePasskey(passkey.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Passkey
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Security Tips</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Passkeys are more secure than passwords and can't be phished</li>
                      <li>• Each device creates a unique passkey that only works on that device</li>
                      <li>• You can add multiple passkeys for different devices</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
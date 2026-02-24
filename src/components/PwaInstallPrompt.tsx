import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, Wifi, WifiOff, Shield, RefreshCw, Smartphone } from "lucide-react";

const STORAGE_KEY = "pwa-install-prompt";
const DAYS_BETWEEN_PROMPTS = 5;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

function shouldShowPrompt(): boolean {
  if (isStandalone()) return false;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return true;

  try {
    const { lastShown, dismissed } = JSON.parse(stored);
    if (!dismissed) return true;
    const daysSince =
      (Date.now() - new Date(lastShown).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= DAYS_BETWEEN_PROMPTS;
  } catch {
    return true;
  }
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!shouldShowPrompt()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // For browsers that don't fire the event (Safari), show manual instructions
    const timeout = setTimeout(() => {
      if (!deferredPrompt && !isStandalone() && shouldShowPrompt()) {
        setVisible(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timeout);
    };
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lastShown: new Date().toISOString(), dismissed: true })
    );
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ installed: true, lastShown: new Date().toISOString() })
        );
      }
      setDeferredPrompt(null);
    }
    setVisible(false);
  }, [deferredPrompt]);

  if (!visible) return null;

  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5 dark:bg-primary/10 shadow-lg">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-lg">
                  Install SIMCardSta.sh
                </h3>
              </div>

              <p className="text-muted-foreground text-sm">
                Get the full app experience on your phone or desktop. Install once
                and your data stays in sync across all your devices.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-start gap-2">
                  <WifiOff className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Works Offline</p>
                    <p className="text-xs text-muted-foreground">
                      Access your SIM cards even without internet
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Secure & Private</p>
                    <p className="text-xs text-muted-foreground">
                      Encrypted data with MFA & passkey support
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Multi-Device Sync</p>
                    <p className="text-xs text-muted-foreground">
                      Install on all devices — data stays in sync
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {deferredPrompt ? (
                  <Button size="sm" onClick={install} className="gap-2">
                    <Download className="h-4 w-4" />
                    Install Now
                  </Button>
                ) : isIos ? (
                  <p className="text-sm text-muted-foreground">
                    Tap <span className="font-semibold">Share</span> →{" "}
                    <span className="font-semibold">Add to Home Screen</span> in
                    Safari to install.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Use your browser menu →{" "}
                    <span className="font-semibold">Install app</span> or{" "}
                    <span className="font-semibold">Add to Home Screen</span>.
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={dismiss}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={dismiss} className="text-muted-foreground text-xs">
              Remind me later
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

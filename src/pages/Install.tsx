import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  WifiOff,
  Shield,
  RefreshCw,
  Smartphone,
  Monitor,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowRight,
  Lock,
  Fingerprint,
} from "lucide-react";


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

type Platform = "ios" | "android" | "desktop-chrome" | "desktop-edge" | "desktop-other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Edg\//.test(ua)) return "desktop-edge";
  if (/Chrome/.test(ua)) return "desktop-chrome";
  return "desktop-other";
}

const platformLabels: Record<Platform, string> = {
  ios: "iPhone / iPad (Safari)",
  android: "Android (Chrome)",
  "desktop-chrome": "Desktop (Chrome)",
  "desktop-edge": "Desktop (Edge)",
  "desktop-other": "Desktop Browser",
};

interface StepProps {
  number: number;
  title: string;
  description: string;
  tip?: string;
  image?: string;
}

function Step({ number, title, description, tip, image }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1 space-y-2">
        <h4 className="font-medium text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
        {image && (
          <div className="mt-2 rounded-lg border overflow-hidden bg-muted/30 max-w-xs">
            <img src={image} alt={title} className="w-full h-auto object-contain" loading="lazy" />
          </div>
        )}
        {tip && (
          <p className="text-xs text-primary italic mt-1">💡 {tip}</p>
        )}
      </div>
    </div>
  );
}

const installSteps: Record<Platform, StepProps[]> = {
  ios: [
    {
      number: 1,
      title: "Open in Safari",
      description:
        "Make sure you're viewing SIMCardSta.sh in Safari. Other browsers on iOS don't support installing web apps.",
      tip: "If you're in Chrome or another browser, copy the URL and paste it into Safari.",
    },
    {
      number: 2,
      title: "Tap the Share button",
      description:
        'Look for the Share icon (a square with an upward arrow) at the bottom of the screen. Tap it to open the share menu.',
      
    },
    {
      number: 3,
      title: 'Scroll down and tap "Add to Home Screen"',
      description:
        'In the share sheet, scroll down until you see "Add to Home Screen" with a plus (+) icon. Tap it.',
      
    },
    {
      number: 4,
      title: 'Tap "Add"',
      description:
        'You can rename the app if you like, then tap "Add" in the top-right corner. The app icon will appear on your home screen.',
      tip: "Launch from the home screen icon for the full-screen app experience.",
    },
  ],
  android: [
    {
      number: 1,
      title: "Open in Chrome",
      description:
        "Make sure you're viewing SIMCardSta.sh in Google Chrome for the best install experience.",
    },
    {
      number: 2,
      title: "Tap the three-dot menu",
      description:
        "Tap the three vertical dots (⋮) in the top-right corner of Chrome to open the browser menu.",
      
    },
    {
      number: 3,
      title: 'Tap "Install app" or "Add to Home screen"',
      description:
        'Look for "Install app" in the menu. On some devices it may say "Add to Home screen" instead.',
      
    },
    {
      number: 4,
      title: "Confirm the installation",
      description:
        'Tap "Install" on the confirmation dialog. The app will be added to your home screen and app drawer.',
      tip: "You may also see an install banner at the bottom of the page — tap it for a quicker install.",
    },
  ],
  "desktop-chrome": [
    {
      number: 1,
      title: "Look for the install icon",
      description:
        'In the address bar, look for a small install icon (monitor with a down arrow) on the right side. You can also go to Menu (⋮) → "Install SIMCardSta.sh...".',
      
    },
    {
      number: 2,
      title: 'Click "Install"',
      description:
        'A dialog will appear asking to install the app. Click "Install" to confirm.',
    },
    {
      number: 3,
      title: "Launch from your desktop",
      description:
        "The app will open in its own window and a shortcut will be added to your desktop or taskbar/dock.",
      tip: "You can pin it to your taskbar (Windows) or Dock (Mac) for quick access.",
    },
  ],
  "desktop-edge": [
    {
      number: 1,
      title: "Look for the install icon",
      description:
        'In the address bar, look for an install icon on the right side. You can also go to Menu (···) → Apps → "Install SIMCardSta.sh".',
      
    },
    {
      number: 2,
      title: 'Click "Install"',
      description:
        'A dialog will appear. Click "Install" to add the app to your device.',
    },
    {
      number: 3,
      title: "Launch from your desktop",
      description:
        "The app will be available in your Start menu and can be pinned to your taskbar.",
    },
  ],
  "desktop-other": [
    {
      number: 1,
      title: "Use Chrome or Edge",
      description:
        "For the best installation experience, open SIMCardSta.sh in Google Chrome or Microsoft Edge.",
      tip: "Firefox and Safari on desktop don't fully support installing web apps yet.",
    },
    {
      number: 2,
      title: "Follow the browser's install prompt",
      description:
        'Look for an install icon in the address bar, or check the browser menu for an "Install" or "Add to Home Screen" option.',
    },
  ],
};

export default function Install() {
  const [platform, setPlatform] = useState<Platform>("desktop-chrome");
  const [expandedPlatform, setExpandedPlatform] = useState<Platform | null>(null);
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const otherPlatforms = (Object.keys(installSteps) as Platform[]).filter(
    (p) => p !== platform
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Hero */}
      <div className="text-center mb-8 space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
          <Download className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Install SIMCardSta.sh</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Install the app on your device for the best experience — faster loading,
          offline access, and seamless multi-device sync.
        </p>

        {installed && (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
            <Check className="h-3 w-3" />
            Already installed on this device
          </Badge>
        )}

        {deferredPrompt && !installed && (
          <Button size="lg" onClick={handleInstall} className="gap-2 mt-2">
            <Download className="h-5 w-5" />
            Install Now
          </Button>
        )}
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 flex gap-3">
            <WifiOff className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Works Offline</h3>
              <p className="text-sm text-muted-foreground">
                View and manage your SIM cards without an internet connection. Data
                syncs automatically when you reconnect.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Secure & Private</h3>
              <p className="text-sm text-muted-foreground">
                Your data is encrypted and protected with two-factor
                authentication and passkey support.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex gap-3">
            <RefreshCw className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Multi-Device Sync</h3>
              <p className="text-sm text-muted-foreground">
                Install on your phone, tablet, and desktop. All changes sync
                instantly across every device.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex gap-3">
            <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Native App Feel</h3>
              <p className="text-sm text-muted-foreground">
                Launches full-screen from your home screen — no browser bars or
                distractions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions for detected platform */}
      <Card className="mb-6 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            {platform === "ios" || platform === "android" ? (
              <Smartphone className="h-5 w-5 text-primary" />
            ) : (
              <Monitor className="h-5 w-5 text-primary" />
            )}
            <CardTitle className="text-lg">
              Install on {platformLabels[platform]}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Your device
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {installSteps[platform].map((step) => (
              <Step key={step.number} {...step} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Other platforms */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Other Devices
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Install on additional devices for full synchronisation.
        </p>

        {otherPlatforms.map((p) => (
          <Card key={p} className="overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              onClick={() =>
                setExpandedPlatform(expandedPlatform === p ? null : p)
              }
            >
              <div className="flex items-center gap-2">
                {p === "ios" || p === "android" ? (
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">
                  {platformLabels[p]}
                </span>
              </div>
              {expandedPlatform === p ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {expandedPlatform === p && (
              <CardContent className="pt-0 pb-4">
                <div className="space-y-4 pt-2 border-t">
                  {installSteps[p].map((step) => (
                    <Step key={step.number} {...step} />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground text-sm">
              Is this the same as downloading from an app store?
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              SIMCardSta.sh is a Progressive Web App (PWA). It installs directly
              from your browser — no app store needed. It works just like a native
              app with offline support, home screen icon, and full-screen mode.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground text-sm">
              Will my data sync across devices?
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Yes! Your data is stored securely in the cloud. Install on as many
              devices as you like — all changes sync automatically in real time.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground text-sm">
              What happens when I'm offline?
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              The app caches your SIM card data locally. You can view your cards
              offline, and any changes will sync when you reconnect.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground text-sm">
              How do I uninstall it?
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Uninstall it the same way you would any other app — long-press the
              icon on mobile, or right-click → Uninstall on desktop.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

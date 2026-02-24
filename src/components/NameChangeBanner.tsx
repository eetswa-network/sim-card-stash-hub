import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Globe, ArrowRight, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "name-change-banner-dismissed";

export function NameChangeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Card className="mb-6 border-accent/30 bg-accent/5 dark:bg-accent/10 shadow-lg">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-lg">
                  We've got a new name!
                </h3>
              </div>

              <p className="text-muted-foreground text-sm">
                <span className="font-semibold text-foreground">SIM Card Stash</span> is now{" "}
                <span className="font-bold text-primary text-base">SIMCardSta.sh</span> — same
                great app, fresh new identity. Update your bookmarks to our new web address.
              </p>

              <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2 w-fit">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-mono font-medium text-foreground">
                  simcardsta.sh
                </span>
              </div>

              <p className="text-muted-foreground text-sm flex items-center gap-1">
                <Smartphone className="h-4 w-4 text-primary shrink-0" />
                Even better — download the app on all your devices for offline access and
                seamless sync.{" "}
                <Link to="/install" className="text-primary underline font-medium whitespace-nowrap">
                  Learn how <ArrowRight className="h-3 w-3 inline" />
                </Link>
              </p>
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
            <Button variant="outline" size="sm" onClick={dismiss}>
              OK, Got it!
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

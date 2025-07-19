import { Smartphone } from "lucide-react";

interface ESimIconProps {
  className?: string;
}

export function ESimIcon({ className }: ESimIconProps) {
  return (
    <div className={`relative inline-flex items-center justify-center h-4 w-4 ${className}`}>
      <Smartphone className="h-4 w-4 text-muted-foreground" />
      <span className="absolute -top-1 -left-1 text-xs font-bold bg-background px-1 rounded border text-muted-foreground">
        e
      </span>
    </div>
  );
}
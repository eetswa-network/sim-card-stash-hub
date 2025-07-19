import { IdCard } from "lucide-react";

interface ESimIconProps {
  className?: string;
}

export function ESimIcon({ className }: ESimIconProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <IdCard className="h-4 w-4 text-muted-foreground" />
      <span className="absolute -left-1 text-xs font-bold text-muted-foreground bg-background px-0.5 rounded">
        e
      </span>
    </div>
  );
}
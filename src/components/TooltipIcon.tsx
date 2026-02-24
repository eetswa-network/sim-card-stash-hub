import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

interface TooltipIconProps {
  icon: LucideIcon;
  tooltip: string;
  className?: string;
  onClick?: () => void;
}

export function TooltipIcon({ icon: Icon, tooltip, className = "h-4 w-4 text-muted-foreground shrink-0", onClick }: TooltipIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0" onClick={onClick} role={onClick ? "button" : undefined}>
          <Icon className={className} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface PhysicalSimIconProps {
  className?: string;
}

export function PhysicalSimIcon({ className }: PhysicalSimIconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={`h-4 w-4 text-muted-foreground ${className}`}
    >
      {/* Card outline */}
      <rect x="4" y="7" width="16" height="10" rx="2" />
      {/* Chip */}
      <rect x="8" y="10" width="4" height="3" rx="0.5" fill="currentColor" />
      {/* Chip contact pattern */}
      <circle cx="9" cy="11" r="0.3" fill="white" />
      <circle cx="10" cy="11" r="0.3" fill="white" />
      <circle cx="11" cy="11" r="0.3" fill="white" />
      <circle cx="9" cy="12" r="0.3" fill="white" />
      <circle cx="10" cy="12" r="0.3" fill="white" />
      <circle cx="11" cy="12" r="0.3" fill="white" />
    </svg>
  );
}
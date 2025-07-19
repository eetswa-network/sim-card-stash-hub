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
      {/* SIM card outline */}
      <path d="M4 4h12l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" />
      {/* Corner cut */}
      <path d="M16 4v4h4" />
      {/* Chip pattern */}
      <rect x="8" y="9" width="8" height="6" rx="1" fill="currentColor" />
      {/* Chip grid pattern */}
      <rect x="9" y="10" width="1.5" height="1" fill="white" />
      <rect x="11" y="10" width="1.5" height="1" fill="white" />
      <rect x="13" y="10" width="1.5" height="1" fill="white" />
      <rect x="9" y="11.5" width="1.5" height="1" fill="white" />
      <rect x="11" y="11.5" width="1.5" height="1" fill="white" />
      <rect x="13" y="11.5" width="1.5" height="1" fill="white" />
      <rect x="9" y="13" width="1.5" height="1" fill="white" />
      <rect x="11" y="13" width="1.5" height="1" fill="white" />
      <rect x="13" y="13" width="1.5" height="1" fill="white" />
    </svg>
  );
}
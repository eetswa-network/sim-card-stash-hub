interface ESimIconProps {
  className?: string;
}

export function ESimIcon({ className }: ESimIconProps) {
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
      {/* eSIM text */}
      <text x="7" y="14" fontSize="4" fill="currentColor" fontWeight="bold">eSIM</text>
    </svg>
  );
}
import { Smartphone, Wifi, Signal, Cpu, CreditCard, Zap, RadioReceiver } from "lucide-react";

export function ESimIconDemo() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">eSIM Icon Options</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        
        {/* Option 1: Text-based eSIM */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
            <path d="M4 4h12l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" />
            <path d="M16 4v4h4" />
            <text x="6" y="15" fontSize="3" fill="currentColor" fontWeight="bold">eSIM</text>
          </svg>
          <span className="text-sm">Text eSIM</span>
        </div>

        {/* Option 2: Smartphone with e overlay */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <div className="relative h-8 w-8 flex items-center justify-center">
            <Smartphone className="h-6 w-6" />
            <span className="absolute -top-1 -left-1 text-xs font-bold bg-background px-1 rounded border">e</span>
          </div>
          <span className="text-sm">Smartphone + e</span>
        </div>

        {/* Option 3: Wifi with e overlay */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <div className="relative h-8 w-8 flex items-center justify-center">
            <Wifi className="h-6 w-6" />
            <span className="absolute -bottom-1 -right-1 text-xs font-bold bg-primary text-primary-foreground px-1 rounded">e</span>
          </div>
          <span className="text-sm">Wifi + e</span>
        </div>

        {/* Option 4: Signal with e overlay */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <div className="relative h-8 w-8 flex items-center justify-center">
            <Signal className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 text-xs font-bold bg-secondary text-secondary-foreground px-1 rounded">e</span>
          </div>
          <span className="text-sm">Signal + e</span>
        </div>

        {/* Option 5: CPU with e overlay */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <div className="relative h-8 w-8 flex items-center justify-center">
            <Cpu className="h-6 w-6" />
            <span className="absolute -top-1 -left-1 text-xs font-bold bg-accent text-accent-foreground px-1 rounded">e</span>
          </div>
          <span className="text-sm">CPU + e</span>
        </div>

        {/* Option 6: Credit Card with embedded pattern */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
            <circle cx="8" cy="16" r="1" fill="currentColor" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
            <circle cx="16" cy="16" r="1" fill="currentColor" />
            <text x="4" y="8" fontSize="2" fill="currentColor">e</text>
          </svg>
          <span className="text-sm">Card + dots</span>
        </div>

        {/* Option 7: Zap (digital energy) */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <div className="relative h-8 w-8 flex items-center justify-center">
            <Zap className="h-6 w-6" />
            <span className="absolute -bottom-1 -left-1 text-xs font-bold bg-yellow-500 text-white px-1 rounded">e</span>
          </div>
          <span className="text-sm">Zap + e</span>
        </div>

        {/* Option 8: Radio Receiver */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <div className="relative h-8 w-8 flex items-center justify-center">
            <RadioReceiver className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 text-xs font-bold bg-green-500 text-white px-1 rounded">e</span>
          </div>
          <span className="text-sm">Radio + e</span>
        </div>

        {/* Option 9: Custom minimalist eSIM */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
            <rect x="6" y="6" width="12" height="8" rx="1" />
            <circle cx="9" cy="10" r="0.5" fill="currentColor" />
            <circle cx="12" cy="10" r="0.5" fill="currentColor" />
            <circle cx="15" cy="10" r="0.5" fill="currentColor" />
            <path d="M8 14h8" strokeWidth="1" />
            <text x="2" y="10" fontSize="3" fill="currentColor" fontWeight="bold">e</text>
          </svg>
          <span className="text-sm">Minimal eSIM</span>
        </div>

        {/* Option 10: Gradient modern */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <rect x="4" y="6" width="16" height="10" rx="2" fill="url(#grad1)" />
            <rect x="7" y="9" width="4" height="3" rx="0.5" fill="white" fillOpacity="0.8" />
            <text x="13" y="13" fontSize="3" fill="white" fontWeight="bold">e</text>
          </svg>
          <span className="text-sm">Gradient eSIM</span>
        </div>

      </div>
    </div>
  );
}
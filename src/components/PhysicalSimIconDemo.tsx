import { CreditCard, IdCard, RectangleHorizontal, Smartphone, Square, Cpu, HardDrive, Contact } from "lucide-react";

export function PhysicalSimIconDemo() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Physical SIM Card Icon Options</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        
        {/* Option 1: Traditional card with chip pattern */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
            <path d="M4 4h12l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" />
            <path d="M16 4v4h4" />
            <rect x="8" y="9" width="8" height="6" rx="1" fill="currentColor" />
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
          <span className="text-sm">Current Design</span>
        </div>

        {/* Option 2: Credit Card style */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <CreditCard className="h-8 w-8" />
          <span className="text-sm">Credit Card</span>
        </div>

        {/* Option 3: ID Card style */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <IdCard className="h-8 w-8" />
          <span className="text-sm">ID Card</span>
        </div>

        {/* Option 4: Rectangle with chip */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
            <rect x="4" y="7" width="16" height="10" rx="2" />
            <rect x="8" y="10" width="4" height="3" rx="0.5" fill="currentColor" />
            <circle cx="9" cy="11" r="0.3" fill="white" />
            <circle cx="10" cy="11" r="0.3" fill="white" />
            <circle cx="11" cy="11" r="0.3" fill="white" />
            <circle cx="9" cy="12" r="0.3" fill="white" />
            <circle cx="10" cy="12" r="0.3" fill="white" />
            <circle cx="11" cy="12" r="0.3" fill="white" />
          </svg>
          <span className="text-sm">Rectangle + Chip</span>
        </div>

        {/* Option 5: Square with notch */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
            <path d="M6 6h8l4 4v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6z" />
            <path d="M14 6v4h4" />
            <rect x="9" y="11" width="6" height="4" rx="0.5" fill="currentColor" />
            <line x1="10" y1="13" x2="14" y2="13" stroke="white" strokeWidth="0.5" />
            <line x1="10" y1="14" x2="14" y2="14" stroke="white" strokeWidth="0.5" />
          </svg>
          <span className="text-sm">Notched Card</span>
        </div>

        {/* Option 6: CPU style */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <Cpu className="h-8 w-8" />
          <span className="text-sm">CPU Style</span>
        </div>

        {/* Option 7: Contact card */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <Contact className="h-8 w-8" />
          <span className="text-sm">Contact Card</span>
        </div>

        {/* Option 8: Minimalist chip */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
            <rect x="7" y="8" width="10" height="8" rx="1" />
            <rect x="10" y="11" width="4" height="2" rx="0.3" fill="currentColor" />
            <circle cx="11" cy="12" r="0.2" fill="white" />
            <circle cx="12" cy="12" r="0.2" fill="white" />
            <circle cx="13" cy="12" r="0.2" fill="white" />
          </svg>
          <span className="text-sm">Minimal Chip</span>
        </div>

        {/* Option 9: Modern gradient */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
            <defs>
              <linearGradient id="simGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <rect x="5" y="7" width="14" height="10" rx="2" fill="url(#simGrad)" />
            <rect x="8" y="10" width="5" height="3" rx="0.5" fill="white" fillOpacity="0.9" />
            <rect x="9" y="11" width="1" height="0.5" fill="#6366f1" />
            <rect x="10.5" y="11" width="1" height="0.5" fill="#6366f1" />
            <rect x="12" y="11" width="1" height="0.5" fill="#6366f1" />
            <rect x="9" y="12" width="1" height="0.5" fill="#6366f1" />
            <rect x="10.5" y="12" width="1" height="0.5" fill="#6366f1" />
            <rect x="12" y="12" width="1" height="0.5" fill="#6366f1" />
          </svg>
          <span className="text-sm">Modern Gradient</span>
        </div>

        {/* Option 10: HardDrive style */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <HardDrive className="h-8 w-8" />
          <span className="text-sm">Hardware Style</span>
        </div>

        {/* Option 11: Classic SIM outline */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
            <path d="M8 5h8l3 3v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5z" />
            <path d="M16 5v3h3" />
            <rect x="11" y="10" width="6" height="4" rx="0.5" />
            <path d="M12 12h4M12 13h4" strokeWidth="1" />
          </svg>
          <span className="text-sm">Classic Outline</span>
        </div>

        {/* Option 12: Detailed chip pattern */}
        <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
            <rect x="6" y="7" width="12" height="10" rx="1" />
            <rect x="9" y="10" width="6" height="4" rx="0.5" fill="currentColor" />
            {/* Grid pattern */}
            <line x1="10" y1="10" x2="10" y2="14" stroke="white" strokeWidth="0.3" />
            <line x1="11" y1="10" x2="11" y2="14" stroke="white" strokeWidth="0.3" />
            <line x1="12" y1="10" x2="12" y2="14" stroke="white" strokeWidth="0.3" />
            <line x1="13" y1="10" x2="13" y2="14" stroke="white" strokeWidth="0.3" />
            <line x1="14" y1="10" x2="14" y2="14" stroke="white" strokeWidth="0.3" />
            <line x1="9" y1="11" x2="15" y2="11" stroke="white" strokeWidth="0.3" />
            <line x1="9" y1="12" x2="15" y2="12" stroke="white" strokeWidth="0.3" />
            <line x1="9" y1="13" x2="15" y2="13" stroke="white" strokeWidth="0.3" />
          </svg>
          <span className="text-sm">Detailed Grid</span>
        </div>

      </div>
    </div>
  );
}
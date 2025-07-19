import { CreditCard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          <Link to="/" className="text-xl font-bold">SIM Manager</Link>
        </div>
        
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link to="/">Dashboard</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/auth">
              <User className="h-4 w-4 mr-2" />
              Account
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
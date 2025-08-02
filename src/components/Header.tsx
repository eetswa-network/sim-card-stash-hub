
import { useState, useEffect } from "react";
import { CreditCard, User, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SearchBar } from "@/components/SearchBar";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        
        setUserProfile(profile);
      }
    };
    
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Header auth state change:", event, session?.user?.id);
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          setUserProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      console.log("Starting sign out process");
      
      // Clear local state first
      setUser(null);
      setUserProfile(null);
      
      // Sign out from Supabase - this will trigger onAuthStateChange
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error);
        // Still navigate even if there's an error
      }
      
      console.log("Sign out completed, navigating to auth");
      
    } catch (error) {
      console.error("Unexpected logout error:", error);
      // Force cleanup on any error
      setUser(null);
      setUserProfile(null);
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          <Link to="/" className="text-xl font-bold">SIM Card Stash</Link>
        </div>
        
        <nav className="flex items-center gap-4">
          {onSearch && (
            <SearchBar onSearch={onSearch} />
          )}
          
          <Button variant="ghost" asChild>
            <Link to="/">Dashboard</Link>
          </Button>
          
          {user ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Account
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {userProfile?.name || user.email}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      {user.email}
                    </div>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        className="w-full gap-2"
                      >
                        <Link to="/security">
                          <Shield className="h-4 w-4" />
                          Security Settings
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSignOut}
                        className="w-full gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </PopoverContent>
            </Popover>
          ) : (
            <Button variant="ghost" asChild>
              <Link to="/auth">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

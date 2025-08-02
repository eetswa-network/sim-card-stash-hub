
import { useState, useEffect } from "react";
import { CreditCard, User, LogOut, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SearchBar } from "@/components/SearchBar";
import logoColorful from "@/assets/logo-colorful.png";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Simple session check without auth state listener to avoid conflicts
    const checkSessionState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          // Try to fetch user profile
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("user_id", session.user.id)
              .maybeSingle();
            setUserProfile(profile);
          } catch (error) {
            console.log("Could not fetch profile:", error);
            setUserProfile(null);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Error checking session in Header:", error);
      }
    };

    // Check immediately and then every 2 seconds to stay in sync
    checkSessionState();
    const interval = setInterval(checkSessionState, 2000);

    return () => clearInterval(interval);
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

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logoColorful} alt="SIM Card Stash" className="w-[300px] h-[300px] object-contain" />
          <Link to="/" className="text-xl font-bold">SIM Card Stash</Link>
        </div>
        
        <nav className="flex items-center gap-4">
          {onSearch && (
            <SearchBar onSearch={onSearch} />
          )}
          
          <Button variant="ghost" asChild>
            <Link to="/">Dashboard</Link>
          </Button>
          
          <Button variant="ghost" asChild>
            <Link to="/updates">Updates</Link>
          </Button>
          
          {user ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={userProfile?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">
                      {getInitials(userProfile?.name || userProfile?.profile_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">Account</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={userProfile?.avatar_url || ""} />
                        <AvatarFallback>
                          {getInitials(userProfile?.name || userProfile?.profile_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {userProfile?.name || userProfile?.profile_name || user.email}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        className="w-full gap-2"
                      >
                        <Link to="/account">
                          <Settings className="h-4 w-4" />
                          Account Details
                        </Link>
                      </Button>
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

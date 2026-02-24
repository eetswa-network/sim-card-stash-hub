import { useState, useEffect, useRef } from "react";
import { Home, User, LogOut, Shield, ShieldCheck, Settings, Menu, X, Smartphone, BarChart3, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SearchBar } from "@/components/SearchBar";
import logoColorful from "@/assets/logo-colorful.png";
import sidewaysLivingLogo from "@/assets/sideways-living-logo.png";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
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

          // Check if user is super admin
          try {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "super_admin")
              .maybeSingle();
            setIsSuperAdmin(!!roleData);
          } catch (error) {
            console.log("Could not fetch role:", error);
            setIsSuperAdmin(false);
          }
        } else {
          setUser(null);
          setUserProfile(null);
          setIsSuperAdmin(false);
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
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 relative">
      <div className="container mx-auto px-4 flex items-center justify-between py-4">
        {/* Logo and title */}
        <div className="flex items-center gap-2 flex-1">
          <img src={sidewaysLivingLogo} alt="Sideways Living" className="hidden md:block h-[150px] w-auto object-contain" />
          <img src="/lovable-uploads/3e0fb5d9-6b3f-4d9d-bf4c-ab3c4cc20334.png" alt="SIM Card Stash" className="md:w-[150px] md:h-[150px] w-[60px] h-[60px] object-contain" />
          <Link to="/" className="md:text-3xl text-lg font-bold">
            SIMCardSta.sh
          </Link>
        </div>

        {/* Hamburger menu button + dropdown */}
        <div className="relative">
          {mobileMenuOpen ? (
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2"
            >
              <X className="h-16 w-16" />
            </Button>
          ) : (
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="sm"
              onClick={() => {
                if (menuButtonRef.current) {
                  const rect = menuButtonRef.current.getBoundingClientRect();
                  setMenuTop(rect.bottom);
                }
                setMobileMenuOpen(true);
              }}
              className="p-2"
            >
              <Menu className="h-16 w-16" />
            </Button>
          )}
        </div>
      </div>

      {/* Menu overlay + panel */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[55]" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute w-2/3 md:w-[20%] z-[60] bg-muted border border-border shadow-lg px-4 pb-4 pt-4 rounded-lg right-0 md:right-[max(0px,calc((100vw-1280px)/2-1.6rem))]"
            style={{ top: `${menuTop}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-2 pb-3 border-b mb-2">
                    <Link to="/account" onClick={() => setMobileMenuOpen(false)}>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={userProfile?.avatar_url || ""} />
                        <AvatarFallback className="text-sm">
                          {getInitials(userProfile?.name || userProfile?.profile_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-sm">
                        {userProfile?.name || userProfile?.profile_name || user.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="justify-start" onClick={() => setMobileMenuOpen(false)}>
                    <Link to="/">
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="justify-start" onClick={() => setMobileMenuOpen(false)}>
                    <Link to="/account">
                      <User className="h-4 w-4 mr-2" />
                      Account Details
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="justify-start" onClick={() => setMobileMenuOpen(false)}>
                    <Link to="/statistics">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Statistics
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="justify-start" onClick={() => setMobileMenuOpen(false)}>
                    <Link to="/devices">
                      <Smartphone className="h-4 w-4 mr-2" />
                      Devices
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="justify-start" onClick={() => setMobileMenuOpen(false)}>
                    <Link to="/updates">
                      <Bell className="h-4 w-4 mr-2" />
                      Updates
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="justify-start" onClick={() => setMobileMenuOpen(false)}>
                    <Link to="/security">
                      <Shield className="h-4 w-4 mr-2" />
                      Security
                    </Link>
                  </Button>
                  {isSuperAdmin && (
                    <Button variant="ghost" size="sm" asChild className="justify-start" onClick={() => setMobileMenuOpen(false)}>
                      <Link to="/admin">
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Admin Panel
                      </Link>
                    </Button>
                  )}
                  <div className="border-t mt-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                      className="w-full justify-center border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <Button variant="ghost" size="sm" asChild className="justify-start" onClick={() => setMobileMenuOpen(false)}>
                  <Link to="/auth">
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Search bar - full width background strip */}
      {onSearch && (
        <div className="w-full bg-primary border-t py-3">
          <div className="container mx-auto px-4 flex justify-center">
            <div className="w-full sm:w-auto max-w-md">
              <SearchBar onSearch={onSearch} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
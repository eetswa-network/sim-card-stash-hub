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
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 min-h-40 flex flex-col py-4 gap-4">
        {/* Logo and title with tablet/desktop navigation */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/3e0fb5d9-6b3f-4d9d-bf4c-ab3c4cc20334.png" alt="SIM Card Stash" className="w-[150px] h-[150px] object-contain" />
            <Link to="/" className="text-3xl font-bold">SIM Card Stash</Link>
          </div>
          
          {/* Tablet & Desktop navigation - vertical buttons on right */}
          <div className="hidden md:flex flex-col gap-1">
            {user ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userProfile?.avatar_url || ""} />
                      <AvatarFallback className="text-sm">
                        {getInitials(userProfile?.name || userProfile?.profile_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">Account</span>
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
                        {isSuperAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild
                            className="w-full gap-2 border-orange-300 text-orange-800 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-200 dark:hover:bg-orange-900"
                          >
                            <Link to="/admin">
                              <Shield className="h-4 w-4" />
                              Admin Panel
                            </Link>
                          </Button>
                        )}
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
              <Button variant="ghost" size="sm" asChild className="flex flex-col items-center gap-1 h-auto py-2">
                <Link to="/auth">
                  <User className="h-10 w-10" />
                  <span className="text-xs">Sign In</span>
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/statistics">Statistics</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/updates">Updates</Link>
            </Button>
          </div>
        </div>
        
        {/* Mobile navigation - horizontal buttons under logo */}
        <div className="flex md:hidden items-center justify-center gap-2 flex-wrap">
          {user ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userProfile?.avatar_url || ""} />
                    <AvatarFallback className="text-sm">
                      {getInitials(userProfile?.name || userProfile?.profile_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">Account</span>
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
                      {isSuperAdmin && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild
                          className="w-full gap-2 border-orange-300 text-orange-800 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-200 dark:hover:bg-orange-900"
                        >
                          <Link to="/admin">
                            <Shield className="h-4 w-4" />
                            Admin Panel
                          </Link>
                        </Button>
                      )}
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
            <Button variant="ghost" size="sm" asChild className="flex flex-col items-center gap-1 h-auto py-2">
              <Link to="/auth">
                <User className="h-10 w-10" />
                <span className="text-xs">Sign In</span>
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Dashboard</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/statistics">Statistics</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/updates">Updates</Link>
          </Button>
        </div>
        
      </div>
      
      {/* Search bar - full width background strip */}
      {onSearch && (
        <div className="w-full bg-muted/50 border-t py-3">
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

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SimCardForm } from "@/components/SimCardForm";
import { SimCardList } from "@/components/SimCardList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Plus, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { UpdateNotifications } from "@/components/UpdateNotifications";

interface IndexProps {
  searchQuery?: string;
}

const Index = ({ searchQuery = "" }: IndexProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMfaWarning, setShowMfaWarning] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Temporarily disabled session timeout to fix login issues
  // useSessionTimeout();

  useEffect(() => {
    let mounted = true;

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Index auth state change:", event, session?.user?.id);
        
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log("User signed out, redirecting to auth");
          setUser(null);
          setShowMfaWarning(false);
          setLoading(false);
          navigate("/auth", { replace: true });
          return;
        }
        
        if (session?.user) {
          console.log("User signed in:", session.user.id);
          setUser(session.user);
          
          // Check MFA status
          try {
            const { data: mfaData } = await supabase
              .from("user_mfa_settings")
              .select("is_enabled")
              .eq("user_id", session.user.id)
              .maybeSingle();
            
            if (!mfaData?.is_enabled) {
              setShowMfaWarning(true);
            }
          } catch (error) {
            console.error("Error checking MFA status:", error);
          }
          
          setLoading(false);
        }
      }
    );

    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session check error:", error);
          setLoading(false);
          navigate("/auth", { replace: true });
          return;
        }
        
        if (!session?.user) {
          console.log("No session found, redirecting to auth");
          setLoading(false);
          navigate("/auth", { replace: true });
          return;
        }
        
        console.log("Session found:", session.user.id);
        setUser(session.user);
        
        // Check MFA status
        try {
          const { data: mfaData } = await supabase
            .from("user_mfa_settings")
            .select("is_enabled")
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          if (!mfaData?.is_enabled) {
            setShowMfaWarning(true);
          }
        } catch (error) {
          console.error("Error checking MFA status:", error);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error checking session:", error);
        setLoading(false);
        navigate("/auth", { replace: true });
      }
    };
    
    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCard(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (card: any) => {
    setEditingCard(card);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCard(null);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if no user (this shouldn't happen due to useEffect, but safety check)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Update Notifications */}
        <UpdateNotifications userId={user.id} />
        
        {/* MFA Warning Banner */}
        {showMfaWarning && (
          <Card className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div className="flex-1">
                  <h3 className="font-medium text-orange-800 dark:text-orange-200">
                    Secure Your Account
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Two-step authentication is not enabled. Protect your account by setting up 2FA.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMfaWarning(false)}
                    className="border-orange-300 text-orange-800 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-200 dark:hover:bg-orange-900"
                  >
                    Later
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/security")}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Set Up Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
          </div>
        </div>

        <div className="space-y-8">
          {showForm && (
            <SimCardForm
              onSuccess={handleFormSuccess}
              editingCard={editingCard}
              onCancel={handleCancel}
            />
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Your SIM Cards</h2>
              {!showForm && (
                <Button 
                  onClick={() => setShowForm(true)} 
                  variant="outline" 
                  className="flex items-center gap-2 bg-transparent border-2 border-black text-black font-semibold hover:bg-black hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Add SIM Card
                </Button>
              )}
            </div>
            <SimCardList 
              onEdit={handleEdit} 
              refreshTrigger={refreshTrigger}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

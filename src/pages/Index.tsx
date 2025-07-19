import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SimCardForm } from "@/components/SimCardForm";
import { SimCardList } from "@/components/SimCardList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Plus, LogOut, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      
      setUserProfile(profile);
    };
    
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          setUser(null);
          setUserProfile(null);
          navigate("/auth");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    }
  };

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

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">SIM Card Manager</h1>
          </div>
          <div className="flex items-center gap-4">
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="w-full gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add SIM Card
              </Button>
            )}
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
            <h2 className="text-xl font-semibold mb-4 text-foreground">Your SIM Cards</h2>
            <SimCardList 
              onEdit={handleEdit} 
              refreshTrigger={refreshTrigger}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

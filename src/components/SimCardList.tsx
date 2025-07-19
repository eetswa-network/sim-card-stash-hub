import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Phone, CreditCard, User, Lock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SimCard {
  id: string;
  sim_number: string;
  phone_number: string;
  carrier?: string;
  status: string;
  notes?: string;
  login?: string;
  password?: string;
  created_at: string;
  updated_at: string;
}

interface SimCardListProps {
  onEdit: (card: SimCard) => void;
  refreshTrigger: number;
}

export function SimCardList({ onEdit, refreshTrigger }: SimCardListProps) {
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSimCards = async () => {
    try {
      const { data, error } = await supabase
        .from("sim_cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSimCards(data || []);
    } catch (error) {
      console.error("Error fetching SIM cards:", error);
      toast({
        title: "Error",
        description: "Failed to load SIM cards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimCards();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("sim_cards")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({ title: "SIM card deleted successfully!" });
      fetchSimCards();
    } catch (error) {
      console.error("Error deleting SIM card:", error);
      toast({
        title: "Error",
        description: "Failed to delete SIM card. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "suspended":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (simCards.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No SIM cards yet</h3>
            <p className="text-muted-foreground">Add your first SIM card to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {simCards.map((card) => (
        <Card key={card.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{card.sim_number}</CardTitle>
              <Badge variant={getStatusColor(card.status)}>
                {card.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">{card.phone_number}</span>
            </div>
            
            {card.carrier && (
              <div className="text-sm text-muted-foreground">
                <strong>Carrier:</strong> {card.carrier}
              </div>
            )}

            {card.login && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{card.login}</span>
              </div>
            )}

            {card.password && (
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">••••••••</span>
              </div>
            )}
            
            {card.notes && (
              <div className="text-sm text-muted-foreground">
                <strong>Notes:</strong> {card.notes}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Added: {new Date(card.created_at).toLocaleDateString()}
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(card)}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete SIM Card</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the SIM card {card.sim_number}? 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(card.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
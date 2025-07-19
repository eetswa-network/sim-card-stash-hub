import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Phone, IdCard, User, Lock, Grid3X3, List } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ESimIcon } from "@/components/ui/esim-icon";
import { PhysicalSimIcon } from "@/components/ui/physical-sim-icon";

interface SimCard {
  id: string;
  sim_number: string;
  phone_number: string;
  carrier?: string;
  status: string;
  sim_type: string;
  notes?: string;
  login?: string;
  password?: string;
  created_at: string;
  updated_at: string;
}

interface SimCardListProps {
  onEdit: (card: SimCard) => void;
  refreshTrigger: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  searchQuery?: string;
}

export function SimCardList({ onEdit, refreshTrigger, viewMode, onViewModeChange, searchQuery }: SimCardListProps) {
  console.log("SimCardList component rendered - IdCard should be available");
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
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

  const toggleRowExpansion = (cardId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

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

  // Filter SIM cards based on search query
  const filteredSimCards = searchQuery 
    ? simCards.filter(card => 
        card.sim_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.phone_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.carrier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.sim_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : simCards;

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

  if (filteredSimCards.length === 0 && searchQuery) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <IdCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No SIM cards found</h3>
            <p className="text-muted-foreground">No SIM cards match your search criteria.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (simCards.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <IdCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No SIM cards yet</h3>
            <p className="text-muted-foreground">Add your first SIM card to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="px-3"
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="px-3"
          >
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSimCards.map((card) => (
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

                <div className="flex items-center gap-2">
                  {card.sim_type === 'eSIM' ? (
                    <ESimIcon />
                  ) : (
                    <PhysicalSimIcon />
                  )}
                  <span className="text-sm">{card.sim_type}</span>
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
      )}

      {/* List View with Expandable Rows */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredSimCards.map((card) => (
            <div key={card.id} className="border rounded-lg overflow-hidden">
              <div 
                className="flex items-center gap-4 p-4 bg-card cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleRowExpansion(card.id)}
              >
                <div className="flex items-center justify-center gap-2 w-20">
                  <div className="flex items-center gap-2">
                    {card.sim_type === 'eSIM' ? (
                      <ESimIcon />
                    ) : (
                      <PhysicalSimIcon />
                    )}
                    <span className="text-sm font-medium">{card.sim_type}</span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{card.phone_number}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <span className="text-muted-foreground">{card.carrier || 'Unknown'}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <Badge variant={getStatusColor(card.status)}>
                    {card.status}
                  </Badge>
                  
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(card)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete SIM Card</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this SIM card? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(card.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
              
              {expandedRows.has(card.id) && (
                <div className="bg-muted/30 border-t p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {card.sim_number && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">SIM Number:</span>
                        <p className="text-sm">{card.sim_number}</p>
                      </div>
                    )}
                    
                    {card.login && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Login:</span>
                        <p className="text-sm">{card.login}</p>
                      </div>
                    )}
                    
                    {card.password && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Password:</span>
                        <p className="text-sm font-mono">{card.password}</p>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Created:</span>
                      <p className="text-sm">{new Date(card.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {card.notes && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Notes:</span>
                      <p className="text-sm mt-1 p-2 bg-background rounded border">{card.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
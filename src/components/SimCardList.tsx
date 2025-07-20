import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Phone, IdCard, User, Lock, Grid3X3, List, Smartphone } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

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
  crab_name?: string;
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
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  const toggleRowExpansion = (cardId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(cardId)) {
      newExpandedRows.delete(cardId);
    } else {
      newExpandedRows.add(cardId);
    }
    setExpandedRows(newExpandedRows);
  };

  const togglePasswordVisibility = (cardId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Filter SIM cards based on search query
  const filteredSimCards = searchQuery 
    ? simCards.filter(card => 
        card.sim_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.phone_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.carrier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.sim_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.crab_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <Card key={card.id} className="hover:shadow-md transition-shadow animate-fade-in">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg break-all">{card.sim_number}</CardTitle>
                  <Badge variant={getStatusColor(card.status)}>
                    {card.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-mono break-all">{card.phone_number}</span>
                </div>

                <div className="flex items-center gap-2">
                  {card.sim_type === 'eSIM' ? (
                    <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <IdCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm">{card.sim_type}</span>
                </div>
                
                {card.carrier && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Carrier:</strong> {card.carrier}
                  </div>
                )}

                {card.crab_name && (
                  <div className="text-sm text-muted-foreground break-words">
                    <strong>Crab Name:</strong> {card.crab_name}
                  </div>
                )}


                {card.login && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-mono text-sm break-all">{card.login}</span>
                  </div>
                )}

                {card.password && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-mono text-sm break-all">
                        {showPasswords[card.id] ? card.password : "••••••••"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`show-password-grid-${card.id}`}
                        checked={showPasswords[card.id] || false}
                        onCheckedChange={() => togglePasswordVisibility(card.id)}
                      />
                      <Label htmlFor={`show-password-grid-${card.id}`} className="text-xs font-normal">
                        Show password
                      </Label>
                    </div>
                  </div>
                )}
                
                {card.notes && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Notes:</strong> <span className="break-words">{card.notes}</span>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Added: {new Date(card.created_at).toLocaleDateString()}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size={isMobile ? "default" : "sm"}
                    onClick={() => onEdit(card)}
                    className="flex-1 min-h-[44px]"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size={isMobile ? "default" : "sm"}
                        className="min-h-[44px]"
                      >
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

      {/* List View */}
      {viewMode === 'list' && (
        <Card className="bg-table-green">
          <CardContent className="p-0">
            {isMobile ? (
              /* Mobile List View - Simplified Card Layout */
              <div className="divide-y divide-table-divider">
                {filteredSimCards.map((card) => (
                  <div key={card.id} className="animate-fade-in">
                    <div 
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toggleRowExpansion(card.id)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-mono text-sm break-all">{card.phone_number}</span>
                          </div>
                          <Badge variant={getStatusColor(card.status)} className="text-xs">
                            {card.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {card.sim_type === 'eSIM' ? (
                              <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <IdCard className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm">{card.sim_type}</span>
                          </div>
                          <span className="font-mono text-xs text-muted-foreground break-all">{card.sim_number}</span>
                        </div>
                        
                        {card.carrier && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Carrier:</strong> {card.carrier}
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(card);
                            }}
                            className="flex-1 min-h-[44px]"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="default"
                                onClick={(e) => e.stopPropagation()}
                                className="min-h-[44px]"
                              >
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
                      </div>
                    </div>
                    
                    {/* Mobile Expanded content */}
                    {expandedRows.has(card.id) && (
                      <div className="px-4 pb-4 bg-table-green-light border-t border-table-divider animate-accordion-down">
                        <div className="space-y-3 pt-4">
                          {card.login && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium">Login:</span>
                              <span className="font-mono text-sm break-all">{card.login}</span>
                            </div>
                          )}
                          
                          {card.password && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium">Password:</span>
                                <span className="font-mono text-sm break-all">
                                  {showPasswords[card.id] ? card.password : "••••••••"}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`show-password-mobile-${card.id}`}
                                  checked={showPasswords[card.id] || false}
                                  onCheckedChange={() => togglePasswordVisibility(card.id)}
                                />
                                <Label htmlFor={`show-password-mobile-${card.id}`} className="text-sm font-normal">
                                  Show password
                                </Label>
                              </div>
                            </div>
                          )}
                          
                          {card.crab_name && (
                            <div>
                              <span className="text-sm font-medium">Crab Name:</span>
                              <span className="text-sm text-muted-foreground ml-2 break-words">{card.crab_name}</span>
                            </div>
                          )}

                          
                          <div>
                            <span className="text-sm font-medium">Created:</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {new Date(card.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {card.notes && (
                            <div>
                              <span className="text-sm font-medium">Notes:</span>
                              <p className="text-sm text-muted-foreground mt-1 break-words">{card.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop List View - Table Layout */
              <>
                {/* Header */}
                <div className="p-4 border-b border-table-divider bg-table-orange">
                  <div className="flex items-center justify-between w-full font-medium text-sm text-muted-foreground">
                    <div className="flex-1 px-2 border-r border-table-divider">Phone Number</div>
                    <div className="flex-1 text-center px-2 border-r border-table-divider">SIM Type</div>
                    <div className="flex-1 text-center px-2 border-r border-table-divider">SIM Number</div>
                    <div className="flex-1 text-center px-2 border-r border-table-divider">Status</div>
                    <div className="flex-1 text-center px-2 border-r border-table-divider">Carrier</div>
                    <div className="flex-1 text-center px-2 border-r border-table-divider">Date</div>
                    <div className="flex-1 text-center px-2">Actions</div>
                  </div>
                </div>
                <div className="divide-y divide-table-divider">
                  {filteredSimCards.map((card) => (
                    <div key={card.id} className="animate-fade-in">
                      <div 
                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => toggleRowExpansion(card.id)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 text-sm flex-1 px-2 border-r border-table-divider">
                            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-mono break-all">{card.phone_number}</span>
                          </div>
                          <div className="flex items-center justify-center gap-2 flex-1 px-2 border-r border-table-divider">
                             {card.sim_type === 'eSIM' ? (
                              <Smartphone className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <IdCard className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="font-mono font-medium flex-1 text-center px-2 border-r border-table-divider break-all">{card.sim_number}</div>
                          <div className="flex-1 text-center px-2 border-r border-table-divider">
                            <Badge variant={getStatusColor(card.status)} className="text-xs">
                              {card.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground flex-1 text-center px-2 border-r border-table-divider">
                            {card.carrier || '-'}
                          </div>
                          <div className="text-xs text-muted-foreground flex-1 text-center px-2 border-r border-table-divider">
                            {new Date(card.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex-1 text-center px-2">
                            <div className="flex gap-2 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(card);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
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
                          </div>
                        </div>
                      </div>
                      
                      {/* Desktop Expanded content */}
                      {expandedRows.has(card.id) && (
                        <div className="px-4 pb-4 bg-table-green-light border-t border-table-divider animate-accordion-down">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            {card.login && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Login:</span>
                                <span className="font-mono text-sm break-all">{card.login}</span>
                              </div>
                            )}
                            
                            {card.password && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Password:</span>
                                  <span className="font-mono text-sm break-all">
                                    {showPasswords[card.id] ? card.password : "••••••••"}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`show-password-list-${card.id}`}
                                    checked={showPasswords[card.id] || false}
                                    onCheckedChange={() => togglePasswordVisibility(card.id)}
                                  />
                                  <Label htmlFor={`show-password-list-${card.id}`} className="text-xs font-normal">
                                    Show password
                                  </Label>
                                </div>
                              </div>
                            )}
                            
                            {card.carrier && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Carrier:</span>
                                <span className="text-sm text-muted-foreground">{card.carrier}</span>
                              </div>
                            )}
                            
                            {card.crab_name && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Crab Name:</span>
                                <span className="text-sm text-muted-foreground break-words">{card.crab_name}</span>
                              </div>
                            )}
                            
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Created:</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(card.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Updated:</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(card.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {card.notes && (
                              <div className="md:col-span-2">
                                <div className="flex items-start gap-2">
                                  <span className="text-sm font-medium">Notes:</span>
                                  <span className="text-sm text-muted-foreground break-words">{card.notes}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
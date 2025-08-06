import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Phone, IdCard, User, Lock, Grid3X3, List, Smartphone, Minimize2, ArrowUpDown, ArrowUp, ArrowDown, Plus, RefreshCcw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { EditableUsageTable } from "./EditableUsageTable";

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
  account_id?: string;
  account?: {
    login: string;
  };
}

interface UsageEntry {
  id: string;
  name: string;
  use_purpose: string;
}

interface SimCardListProps {
  onEdit: (card: SimCard) => void;
  refreshTrigger: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  searchQuery?: string;
  showForm?: boolean;
  onAddSimCard?: () => void;
}

export function SimCardList({ onEdit, refreshTrigger, viewMode, onViewModeChange, searchQuery, showForm, onAddSimCard }: SimCardListProps) {
  console.log("SimCardList component mounted with props:", { refreshTrigger, viewMode, searchQuery });
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [usageData, setUsageData] = useState<{[key: string]: UsageEntry[]}>({});
  const [sortField, setSortField] = useState<'phone_number' | 'sim_number' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchSimCards = async () => {
    console.log("Starting fetchSimCards...");
    
    // Check current auth state for debugging
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Current auth state in SimCardList:", session?.user?.id);

    try {
      console.log("Making Supabase query for sim_cards...");
      const { data, error } = await supabase
        .from("sim_cards")
        .select(`
          *,
          account:accounts(login)
        `)
        .order("created_at", { ascending: false });

      console.log("Supabase response:", { data, error });
      
      if (error) {
        console.error("Error fetching sim cards:", error);
        throw error;
      }
      
      console.log("Raw data from query:", data);
      setSimCards(data || []);
      console.log("Set sim cards data:", data?.length || 0, "cards");

      // Fetch usage data for all sim cards
      if (data && data.length > 0) {
        console.log("Fetching usage data for", data.length, "cards");
        const { data: usageData, error: usageError } = await supabase
          .from("sim_card_usage")
          .select("*")
          .in("sim_card_id", data.map(card => card.id));

        if (usageError) {
          console.error("Error fetching usage data:", usageError);
        } else {
          console.log("Usage data fetched:", usageData?.length || 0, "entries");
          // Group usage data by sim_card_id
          const groupedUsage = (usageData || []).reduce((acc, usage) => {
            if (!acc[usage.sim_card_id]) {
              acc[usage.sim_card_id] = [];
            }
            acc[usage.sim_card_id].push(usage);
            return acc;
          }, {} as {[key: string]: UsageEntry[]});
          setUsageData(groupedUsage);
        }
      } else {
        console.log("No sim cards found, skipping usage data fetch");
      }
    } catch (error) {
      console.error("Error fetching SIM cards:", error);
      toast({
        title: "Error",
        description: "Failed to load SIM cards. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("SimCardList useEffect triggered, refreshTrigger:", refreshTrigger);
    fetchSimCards();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      // Instead of deleting, mark the SIM card as inactive (soft delete)
      const { error } = await supabase
        .from("sim_cards")
        .update({ status: "inactive" })
        .eq("id", id);

      if (error) throw error;
      
      toast({ title: "SIM card marked as inactive successfully!" });
      fetchSimCards();
    } catch (error) {
      console.error("Error deactivating SIM card:", error);
      toast({
        title: "Error",
        description: "Failed to deactivate SIM card. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSimSwap = async (card: SimCard) => {
    try {
      // Mark the original card as inactive (since "swapped" isn't allowed)
      const { error: updateError } = await supabase
        .from("sim_cards")
        .update({ status: "inactive" })
        .eq("id", card.id);

      if (updateError) throw updateError;

      // Create a new card with the same data but empty sim_number
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const newCard = {
        sim_number: "", // Empty sim number for new card
        phone_number: card.phone_number,
        carrier: card.carrier,
        status: "active",
        sim_type: card.sim_type,
        notes: card.notes,
        login: card.login,
        password: card.password,
        account_id: card.account_id,
        user_id: user.id
      };

      const { data: insertedCard, error: insertError } = await supabase
        .from("sim_cards")
        .insert([newCard])
        .select()
        .maybeSingle();

      if (insertError) throw insertError;
      if (!insertedCard) throw new Error("Failed to create new SIM card");

      console.log("New card created:", insertedCard.id);

      // Copy usage data from the original card to the new card
      const { data: usageData, error: usageError } = await supabase
        .from("sim_card_usage")
        .select("*")
        .eq("sim_card_id", card.id);

      if (usageError) {
        console.error("Error fetching usage data:", usageError);
        throw usageError;
      }

      console.log("Original usage data found:", usageData?.length || 0, "entries");

      if (usageData && usageData.length > 0) {
        const newUsageData = usageData.map(usage => ({
          name: usage.name,
          use_purpose: usage.use_purpose,
          sim_card_id: insertedCard.id,
          user_id: user.id
        }));

        console.log("Inserting usage data for new card:", newUsageData);

        const { error: usageInsertError } = await supabase
          .from("sim_card_usage")
          .insert(newUsageData);

        if (usageInsertError) {
          console.error("Error inserting usage data:", usageInsertError);
          throw usageInsertError;
        }

        console.log("Usage data successfully copied to new card");
      } else {
        console.log("No usage data found for original card");
      }
      
      toast({ title: "SIM swap completed! New record created with empty SIM number." });
      fetchSimCards();
      
      // Open edit form for the newly created card
      onEdit(insertedCard);
    } catch (error) {
      console.error("Error performing SIM swap:", error);
      toast({
        title: "Error",
        description: "Failed to perform SIM swap. Please try again.",
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

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  const handleUsageUpdate = (simCardId: string, newUsageData: UsageEntry[]) => {
    setUsageData(prev => ({
      ...prev,
      [simCardId]: newUsageData
    }));
  };

  const handleSort = (field: 'phone_number' | 'sim_number') => {
    if (sortField === field) {
      // Toggle direction or clear sort
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'phone_number' | 'sim_number') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  // Filter and sort SIM cards
  let filteredAndSortedCards = searchQuery 
    ? simCards.filter(card => {
        const searchLower = searchQuery.toLowerCase();
        
        // Check if search matches phone number - only show active records
        const phoneMatch = card.phone_number.toLowerCase().includes(searchLower);
        if (phoneMatch && card.status !== 'active') {
          return false; // Don't show inactive records for phone number matches
        }
        
        // Check if search matches SIM number - show both active and inactive
        const simNumberMatch = card.sim_number.toLowerCase().includes(searchLower);
        
        // Search in usage data - only show active records
        const usageMatch = usageData[card.id]?.some(usage => 
          usage.name.toLowerCase().includes(searchLower) ||
          usage.use_purpose.toLowerCase().includes(searchLower)
        ) || false;
        if (usageMatch && card.status !== 'active') {
          return false; // Don't show inactive records for usage data matches
        }
        
        // Search in account login - only show active records
        const accountMatch = card.account?.login?.toLowerCase().includes(searchLower) || false;
        if (accountMatch && card.status !== 'active') {
          return false; // Don't show inactive records for login matches
        }
        
        // Check other fields (carrier, status, sim_type, notes)
        const otherFieldsMatch = card.carrier?.toLowerCase().includes(searchLower) ||
          card.status.toLowerCase().includes(searchLower) ||
          card.sim_type.toLowerCase().includes(searchLower) ||
          card.notes?.toLowerCase().includes(searchLower);
        
        return phoneMatch || simNumberMatch || otherFieldsMatch || usageMatch || accountMatch;
      })
    : simCards;

  // Apply sorting if in list view and sort field is selected
  if (viewMode === 'list' && sortField) {
    filteredAndSortedCards = [...filteredAndSortedCards].sort((a, b) => {
      const aValue = a[sortField].toLowerCase();
      const bValue = b[sortField].toLowerCase();
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }

  const filteredSimCards = filteredAndSortedCards;

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
      {/* SIM Type Legend */}
      <div className="flex items-center justify-center gap-6 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Smartphone className="h-4 w-4" />
          <span>eSIM</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <IdCard className="h-4 w-4" />
          <span>Physical SIM</span>
        </div>
      </div>

      {/* Add SIM Card and View Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {!showForm && onAddSimCard && (
            <Button 
              onClick={onAddSimCard} 
              variant="outline" 
              className="flex items-center gap-2 bg-transparent border-2 border-black text-black font-semibold hover:bg-black hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Add SIM Card
            </Button>
          )}
          {viewMode === 'list' && expandedRows.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              className="px-3"
            >
              <Minimize2 className="h-4 w-4 mr-1" />
              Collapse All
            </Button>
          )}
        </div>
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
            <Card key={card.id} className="hover:shadow-md transition-shadow animate-fade-in border border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-lg break-all ${card.status === 'inactive' ? 'line-through' : ''}`}>{card.sim_number}</CardTitle>
                  <Badge variant={getStatusColor(card.status)}>
                    {card.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className={`font-mono break-all ${card.status === 'inactive' ? 'line-through' : ''}`}>{card.phone_number}</span>
                </div>

                <div className="flex items-center gap-2">
                  {card.sim_type === 'eSIM' ? (
                    <Smartphone className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <IdCard className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm">{card.sim_type}</span>
                </div>
                
                {card.carrier && (
                  <div className="text-muted-foreground">
                    <strong>Carrier:</strong> {card.carrier}
                  </div>
                )}

                <EditableUsageTable
                  simCardId={card.id}
                  usageData={usageData[card.id] || []}
                  onUsageUpdate={handleUsageUpdate}
                />


                {(card.login || card.account?.login) && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-mono text-sm break-all">{card.account?.login || card.login}</span>
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
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Added: {new Date(card.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(card)}
                      className="min-h-[32px] w-8 h-8 p-0 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 hover:border-yellow-600"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSimSwap(card)}
                      className="min-h-[32px] w-8 h-8 p-0 bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600"
                      title="SIM Swap"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="min-h-[32px] w-8 h-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deactivate SIM Card</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to deactivate the SIM card {card.sim_number}? 
                            The record will be kept for historical purposes but marked as inactive.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(card.id)}>
                            Deactivate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
                      <div className="space-y-2">
                        {/* First line: phone icon+number, carrier - evenly spread */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                            <span className={`font-mono text-sm break-all ${card.status === 'inactive' ? 'line-through' : ''}`}>{card.phone_number}</span>
                          </div>
                          <span className="text-sm font-medium text-right">{card.carrier || 'No carrier'}</span>
                        </div>
                        
                        {/* Second line: SIM type icon + SIM number and active status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {card.sim_type === 'eSIM' ? (
                              <Smartphone className="h-5 w-5 text-muted-foreground shrink-0" />
                            ) : (
                              <IdCard className="h-5 w-5 text-muted-foreground shrink-0" />
                            )}
                            <span className={`font-mono text-sm break-all ${card.status === 'inactive' ? 'line-through' : ''}`}>{card.sim_number}</span>
                          </div>
                          <Badge variant={getStatusColor(card.status)} className="text-xs">
                            {card.status}
                          </Badge>
                        </div>
                        
                        {/* Third line: edit, sim swap and deactivate buttons */}
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(card);
                            }}
                            className="w-8 h-8 p-0 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 hover:border-yellow-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSimSwap(card);
                            }}
                            className="w-8 h-8 p-0 bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600"
                            title="SIM Swap"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                className="w-8 h-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate SIM Card</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to deactivate the SIM card {card.sim_number}? 
                                  The record will be kept for historical purposes but marked as inactive.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(card.id)}>
                                  Deactivate
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
                          {(card.login || card.account?.login) && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium">Login:</span>
                              <span className="font-mono text-sm break-all">{card.account?.login || card.login}</span>
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
                          
                          <EditableUsageTable
                            simCardId={card.id}
                            usageData={usageData[card.id] || []}
                            onUsageUpdate={handleUsageUpdate}
                          />

                          
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
                  <div className="flex items-center w-full font-medium text-sm text-table-divider">
                    <button 
                      className="flex-[1.5] px-2 border-r border-black flex items-center justify-start gap-1 hover:bg-black/10 transition-colors"
                      onClick={() => handleSort('phone_number')}
                    >
                      <span className="leading-tight">Phone Number</span>
                      {getSortIcon('phone_number')}
                    </button>
                    <button 
                      className="flex-[2] px-2 border-r border-black flex items-center justify-center gap-1 hover:bg-black/10 transition-colors"
                      onClick={() => handleSort('sim_number')}
                    >
                      SIM Number
                      {getSortIcon('sim_number')}
                    </button>
                    <div className="flex-[1] text-center px-2 border-r border-black">Carrier</div>
                    <div className="flex-[1] text-center px-2 border-r border-black">Status</div>
                    <div className="flex-[1.5] text-center px-2">Actions</div>
                  </div>
                </div>
                <div className="divide-y divide-table-divider">
                  {filteredSimCards.map((card) => (
                    <div key={card.id} className="animate-fade-in">
                      <div 
                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => toggleRowExpansion(card.id)}
                      >
                        <div className="flex items-center w-full">
                          <div className="flex items-center gap-2 flex-[1.5] px-2 border-r border-black">
                            <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                            <span className={`font-mono truncate ${card.status === 'inactive' ? 'line-through' : ''}`}>{card.phone_number}</span>
                          </div>
                          <div className="flex items-center justify-center gap-2 flex-[2] px-2 border-r border-black">
                            {card.sim_type === 'eSIM' ? (
                              <Smartphone className="h-5 w-5 text-muted-foreground shrink-0" />
                            ) : (
                              <IdCard className="h-5 w-5 text-muted-foreground shrink-0" />
                            )}
                            <span className={`font-mono font-medium truncate ${card.status === 'inactive' ? 'line-through' : ''}`}>{card.sim_number}</span>
                          </div>
                          <div className="flex-[1] text-center px-2 border-r border-black">
                            {card.carrier || '-'}
                          </div>
                          <div className="flex-[1] text-center px-2 border-r border-black">
                            <Badge variant={getStatusColor(card.status)}>
                              {card.status}
                            </Badge>
                          </div>
                          <div className="flex-[1.5] flex justify-center items-center px-2">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(card);
                                }}
                                className="w-8 h-8 p-0 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 hover:border-yellow-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSimSwap(card);
                                }}
                                className="w-8 h-8 p-0 bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600"
                                title="SIM Swap"
                              >
                                <RefreshCcw className="h-4 w-4" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-8 h-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Deactivate SIM Card</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to deactivate the SIM card {card.sim_number}? 
                                      The record will be kept for historical purposes but marked as inactive.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(card.id)}>
                                      Deactivate
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
                            {(card.login || card.account?.login) && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Login:</span>
                                <span className="font-mono text-sm break-all">{card.account?.login || card.login}</span>
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
                            
                            <div className="md:col-span-2">
                              <EditableUsageTable
                                simCardId={card.id}
                                usageData={usageData[card.id] || []}
                                onUsageUpdate={handleUsageUpdate}
                              />
                            </div>
                            
                            
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
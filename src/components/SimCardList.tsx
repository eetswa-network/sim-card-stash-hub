import { useState, useEffect, useCallback } from "react";
import { cacheSimCards, getCachedSimCards, cacheUsageData, getCachedUsageData, isOnline } from "@/lib/offlineDb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Phone, IdCard, User, Lock, Grid3X3, List, Smartphone, Minimize2, Maximize2, ArrowUpDown, ArrowUp, ArrowDown, Plus, RefreshCcw, History, MapPin, CalendarPlus, CalendarClock, Eye, EyeOff, Share2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { EditableUsageTable } from "./EditableUsageTable";
import { SimCardHistoryModal } from "./SimCardHistoryModal";
import { ShareSimCardModal } from "./ShareSimCardModal";
import { TooltipIcon } from "./TooltipIcon";
import ebayLogo from "@/assets/ebay-logo.png";
import paypalLogo from "@/assets/paypal-logo.png";
import afterpayLogo from "@/assets/afterpay-logo.png";
import klarnaLogo from "@/assets/klarna-logo.png";
import auspostLogo from "@/assets/auspost-logo.png";

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
  location?: string;
  account?: {
    login: string;
  };
  isShared?: boolean;
  sharedByName?: string;
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
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showPasswords, setShowPasswords] = useState<{[key: string]: string | boolean}>({});
  const [usageData, setUsageData] = useState<{[key: string]: UsageEntry[]}>({});
  const [sortField, setSortField] = useState<'phone_number' | 'sim_number' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [historyModalCard, setHistoryModalCard] = useState<SimCard | null>(null);
  const [shareModalCard, setShareModalCard] = useState<SimCard | null>(null);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchSimCards = async () => {
    console.log("Starting fetchSimCards...");
    
    // Check current auth state for debugging
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Current auth state in SimCardList:", session?.user?.id);

    // Ensure user is authenticated before fetching
    if (!session?.user?.id) {
      console.log("No authenticated user, skipping fetch");
      setLoading(false);
      return;
    }

    const userId = session.user.id;

    try {
      if (!isOnline()) {
        // Offline mode: load from IndexedDB
        console.log("Offline mode: loading cached data");
        const cachedCards = await getCachedSimCards();
        setSimCards(cachedCards);

        // Load cached usage data
        const groupedUsage: {[key: string]: UsageEntry[]} = {};
        for (const card of cachedCards) {
          const usage = await getCachedUsageData(card.id);
          if (usage.length > 0) {
            groupedUsage[card.id] = usage;
          }
        }
        setUsageData(groupedUsage);

        toast({
          title: "Offline Mode",
          description: "Showing cached data. Changes will sync when you're back online.",
        });
        return;
      }

      console.log("Making Supabase query for sim_cards...");
      const { data, error } = await supabase
        .from("sim_cards")
        .select(`
          *,
          account:accounts(login)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      console.log("Supabase response:", { data, error });
      
      if (error) {
        console.error("Error fetching sim cards:", error);
        throw error;
      }
      
      setSimCards(data || []);

      // Cache sim cards for offline use
      if (data) {
        await cacheSimCards(data);
      }

      // Fetch shared SIM cards
      const { data: shares } = await supabase
        .from("sim_card_shares")
        .select("sim_card_id, owner_id")
        .eq("shared_with_id", userId);

      if (shares && shares.length > 0) {
        const sharedCardIds = shares.map(s => s.sim_card_id);
        const ownerIds = [...new Set(shares.map(s => s.owner_id))];
        
        const [sharedCardsResult, ownerProfiles] = await Promise.all([
          supabase.from("sim_cards").select("*, account:accounts(login)").in("id", sharedCardIds),
          supabase.from("profiles").select("user_id, profile_name, name").in("user_id", ownerIds)
        ]);

        const profileMap = new Map((ownerProfiles.data || []).map(p => [p.user_id, p.profile_name || p.name || "Someone"]));
        const shareOwnerMap = new Map(shares.map(s => [s.sim_card_id, s.owner_id]));

        if (sharedCardsResult.data) {
          const sharedCards = sharedCardsResult.data.map(card => ({
            ...card,
            isShared: true,
            sharedByName: profileMap.get(shareOwnerMap.get(card.id) || "") || "Someone",
          }));
          setSimCards(prev => [...prev, ...sharedCards]);
        }
      }

      // Fetch usage data for all sim cards
      if (data && data.length > 0) {
        const { data: usageResult, error: usageError } = await supabase
          .from("sim_card_usage")
          .select("*")
          .eq("user_id", userId)
          .in("sim_card_id", data.map(card => card.id));

        if (usageError) {
          console.error("Error fetching usage data:", usageError);
        } else {
          const groupedUsage = (usageResult || []).reduce((acc, usage) => {
            if (!acc[usage.sim_card_id]) {
              acc[usage.sim_card_id] = [];
            }
            acc[usage.sim_card_id].push(usage);
            return acc;
          }, {} as {[key: string]: UsageEntry[]});
          setUsageData(groupedUsage);

          // Cache usage data per sim card for offline use
          for (const [simCardId, entries] of Object.entries(groupedUsage)) {
            await cacheUsageData(simCardId, entries as UsageEntry[]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching SIM cards:", error);
      
      // Try loading cached data on network failure
      const cachedCards = await getCachedSimCards();
      if (cachedCards.length > 0) {
        setSimCards(cachedCards);
        const groupedUsage: {[key: string]: UsageEntry[]} = {};
        for (const card of cachedCards) {
          const usage = await getCachedUsageData(card.id);
          if (usage.length > 0) {
            groupedUsage[card.id] = usage;
          }
        }
        setUsageData(groupedUsage);
        toast({
          title: "Offline Mode",
          description: "Showing cached data. Some information may be outdated.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load SIM cards and no cached data available.",
          variant: "destructive",
        });
      }
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to deactivate SIM cards.",
          variant: "destructive",
        });
        return;
      }

      // Instead of deleting, mark the SIM card as inactive (soft delete)
      const { error } = await supabase
        .from("sim_cards")
        .update({ status: "inactive" })
        .eq("id", id)
        .eq("user_id", user.id);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Mark the original card as swapped - include user_id filter for security
      const { error: updateError } = await supabase
        .from("sim_cards")
        .update({ status: "swapped" })
        .eq("id", card.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Create a new card with the same data but empty sim_number

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
        location: card.location,
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
      const { data: usageDataToCopy, error: usageError } = await supabase
        .from("sim_card_usage")
        .select("*")
        .eq("sim_card_id", card.id)
        .eq("user_id", user.id);

      if (usageError) {
        console.error("Error fetching usage data:", usageError);
        throw usageError;
      }

      console.log("Original usage data found:", usageDataToCopy?.length || 0, "entries");

      if (usageDataToCopy && usageDataToCopy.length > 0) {
        const newUsageData = usageDataToCopy.map(usage => ({
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
      case "expired":
        return "outline";
      case "swapped":
        return "swapped" as any;
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

  const togglePasswordVisibility = async (cardId: string) => {
    // If already visible, just hide it
    if (showPasswords[cardId]) {
      setShowPasswords(prev => ({
        ...prev,
        [cardId]: false
      }));
      return;
    }

    // Show a message that passwords are now hashed and cannot be decrypted
    const card = simCards.find(c => c.id === cardId);
    if (card?.password) {
      toast({
        title: "Password Security Update",
        description: "Account passwords are now securely hashed and cannot be displayed. Please use your password manager or reset the password if needed.",
        variant: "default"
      });
      
      // Mark as "attempted to show" to prevent repeated attempts
      setShowPasswords(prev => ({
        ...prev,
        [cardId]: "••••••••"
      }));
    }
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
        
        // Check if search matches any field
        const phoneMatch = card.phone_number.toLowerCase().includes(searchLower);
        const simNumberMatch = card.sim_number.toLowerCase().includes(searchLower);
        const carrierMatch = card.carrier?.toLowerCase().includes(searchLower) || false;
        const statusMatch = card.status.toLowerCase().includes(searchLower);
        const simTypeMatch = card.sim_type.toLowerCase().includes(searchLower);
        const notesMatch = card.notes?.toLowerCase().includes(searchLower) || false;
        const loginMatch = card.login?.toLowerCase().includes(searchLower) || false;
        const accountMatch = card.account?.login?.toLowerCase().includes(searchLower) || false;
        const locationMatch = card.location?.toLowerCase().includes(searchLower) || false;
        
        // Search in usage data
        const usageMatch = usageData[card.id]?.some(usage => 
          usage.name.toLowerCase().includes(searchLower) ||
          usage.use_purpose.toLowerCase().includes(searchLower)
        ) || false;
        
        // If any field matches, show the card (even if inactive/swapped/expired)
        return phoneMatch || simNumberMatch || carrierMatch || statusMatch || 
               simTypeMatch || notesMatch || loginMatch || accountMatch || locationMatch || usageMatch;
      })
    : simCards.filter(card => 
        card.status !== 'inactive' && 
        card.status !== 'swapped' && 
        card.status !== 'expired'
      ); // Hide inactive, swapped, and expired cards when no search query

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

  // Find the replacement card for a swapped SIM (same phone_number, created after)
  const navigateToSwappedCard = (card: SimCard) => {
    const replacement = simCards.find(
      c => c.phone_number === card.phone_number && c.id !== card.id && new Date(c.created_at) > new Date(card.created_at)
    );
    if (replacement) {
      // If the replacement isn't in the filtered list, clear search first
      const isVisible = filteredSimCards.some(c => c.id === replacement.id);
      if (!isVisible) {
        toast({
          title: "Replacement card not visible",
          description: "The replacement SIM card may be hidden by current filters. Try clearing your search.",
        });
        return;
      }
      // Expand and scroll to the replacement card
      setExpandedRows(prev => new Set(prev).add(replacement.id));
      setHighlightedCardId(replacement.id);
      setTimeout(() => {
        document.getElementById(`sim-card-${replacement.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightedCardId(null), 2000);
      }, 100);
    } else {
      toast({
        title: "No replacement found",
        description: "Could not find the SIM card this was swapped to.",
      });
    }
  };

  const renderStatusBadge = (card: SimCard, className?: string) => {
    const badge = (
      <Badge 
        variant={getStatusColor(card.status)} 
        className={`${className || ''} ${card.status === 'swapped' ? 'cursor-pointer hover:ring-2 hover:ring-primary' : ''}`}
        onClick={card.status === 'swapped' ? (e: React.MouseEvent) => { e.stopPropagation(); navigateToSwappedCard(card); } : undefined}
      >
        {card.status}
      </Badge>
    );
    return badge;
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
            <p className="text-muted-foreground mb-4">Add your first SIM card to get started.</p>
            {!showForm && onAddSimCard && (
              <Button 
                onClick={onAddSimCard} 
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add SIM Card
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={1000}>
    <div className="space-y-4">
      {/* Add SIM Card and View Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {!showForm && onAddSimCard && (
            <TooltipIcon 
              icon={Plus} 
              tooltip="Add SIM Card" 
              className="h-5 w-5 cursor-pointer text-foreground hover:text-primary transition-colors"
              onClick={onAddSimCard}
            />
          )}
          {viewMode === 'list' && filteredSimCards.length > 0 && !isMobile && expandedRows.size < filteredSimCards.length && (
            <TooltipIcon 
              icon={Maximize2} 
              tooltip="Expand All" 
              className="h-5 w-5 cursor-pointer text-foreground hover:text-primary transition-colors"
              onClick={() => setExpandedRows(new Set(filteredSimCards.map(card => card.id)))}
            />
          )}
          {viewMode === 'list' && !isMobile && expandedRows.size > 0 && (
            <TooltipIcon 
              icon={Minimize2} 
              tooltip="Collapse All" 
              className="h-5 w-5 cursor-pointer text-foreground hover:text-primary transition-colors"
              onClick={collapseAll}
            />
          )}
          {viewMode === 'list' && filteredSimCards.length > 0 && isMobile && (
            <TooltipIcon 
              icon={expandedRows.size === filteredSimCards.length ? Minimize2 : Maximize2} 
              tooltip={expandedRows.size === filteredSimCards.length ? "Collapse All" : "Expand All"} 
              className="h-5 w-5 cursor-pointer text-foreground hover:text-primary transition-colors"
              onClick={() => {
                if (expandedRows.size === filteredSimCards.length) {
                  collapseAll();
                } else {
                  setExpandedRows(new Set(filteredSimCards.map(card => card.id)));
                }
              }}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <TooltipIcon 
            icon={Grid3X3} 
            tooltip="Grid View" 
            className={`h-5 w-5 cursor-pointer transition-colors ${viewMode === 'grid' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onViewModeChange('grid')}
          />
          <TooltipIcon 
            icon={List} 
            tooltip="List View" 
            className={`h-5 w-5 cursor-pointer transition-colors ${viewMode === 'list' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onViewModeChange('list')}
          />
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSimCards.map((card) => (
            <Card key={card.id} id={`sim-card-${card.id}`} className={`hover:shadow-md transition-shadow animate-fade-in border border-border ${highlightedCardId === card.id ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-3">
                {/* Row 1: Phone number with icon on left, status on right */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TooltipIcon icon={Phone} tooltip="Phone Number" className="h-5 w-5 text-muted-foreground shrink-0" />
                    <CardTitle className={`text-lg break-all ${card.status === 'inactive' || card.status === 'expired' || card.status === 'swapped' ? 'line-through' : ''}`}>{card.phone_number}</CardTitle>
                  </div>
                  {renderStatusBadge(card)}
                  {card.isShared && <Badge variant="secondary" className="text-xs">Shared by {card.sharedByName}</Badge>}
                </div>
                {/* Row 2: SIM number with icon on left, carrier on right */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {card.sim_type === 'eSIM' ? (
                      <TooltipIcon icon={Smartphone} tooltip="eSIM" className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <TooltipIcon icon={IdCard} tooltip="Physical SIM" className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <span className={`font-mono break-all ${card.status === 'inactive' || card.status === 'expired' || card.status === 'swapped' ? 'line-through' : ''}`}>{card.sim_number}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{card.carrier || 'No carrier'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {card.location && (
                  <div className="flex items-center gap-2">
                    <TooltipIcon icon={MapPin} tooltip="Device" />
                    <span className="text-sm">{card.location}</span>
                  </div>
                )}

                <EditableUsageTable
                  simCardId={card.id}
                  usageData={usageData[card.id] || []}
                  onUsageUpdate={handleUsageUpdate}
                />


                {(card.login || card.account?.login) && (
                  <div className="flex items-center gap-2">
                    <TooltipIcon icon={User} tooltip="Login" />
                    <span className="font-mono text-sm break-all">{card.account?.login || card.login}</span>
                  </div>
                )}

                {card.password && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TooltipIcon icon={Lock} tooltip="Password" />
                      <span className="font-mono text-sm break-all">
                        {showPasswords[card.id] ? card.password : "•".repeat(card.password.length)}
                      </span>
                    </div>
                    <TooltipIcon
                      icon={showPasswords[card.id] ? EyeOff : Eye}
                      tooltip={showPasswords[card.id] ? "Hide password" : "Show password"}
                      className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => togglePasswordVisibility(card.id)}
                    />
                  </div>
                )}
                
                {card.notes && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Notes:</strong> <span className="break-words">{card.notes}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <TooltipIcon icon={CalendarPlus} tooltip="Date Added" className="h-3 w-3 text-muted-foreground shrink-0" />
                    {new Date(card.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    {!card.isShared && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShareModalCard(card)}
                        className="min-h-[32px] w-8 h-8 p-0 bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
                        title="Share"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                    {!card.isShared && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(card)}
                        className="min-h-[32px] w-8 h-8 p-0 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 hover:border-yellow-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {!card.isShared && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSimSwap(card)}
                        className="min-h-[32px] w-8 h-8 p-0 bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600"
                        title="SIM Swap"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {!card.isShared && (
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
                    )}
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
                  <div key={card.id} id={`sim-card-${card.id}`} className={`animate-fade-in ${highlightedCardId === card.id ? 'ring-2 ring-primary' : ''}`}>
                    <div 
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toggleRowExpansion(card.id)}
                    >
                      <div className="space-y-2">
                        {/* First line: phone icon+number, carrier and status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TooltipIcon icon={Phone} tooltip="Phone Number" className="h-5 w-5 text-muted-foreground shrink-0" />
                            <span className={`font-mono text-sm break-all text-black dark:text-white ${card.status === 'inactive' || card.status === 'expired' || card.status === 'swapped' ? 'line-through' : ''}`}>{card.phone_number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-right text-black dark:text-white">{card.carrier || 'No carrier'}</span>
                            {renderStatusBadge(card, "text-xs")}
                            {card.isShared && <Badge variant="secondary" className="text-xs">Shared</Badge>}
                          </div>
                        </div>
                        
                        {/* Second line: SIM type icon + SIM number + action buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {card.sim_type === 'eSIM' ? (
                              <TooltipIcon icon={Smartphone} tooltip="eSIM" className="h-5 w-5 text-muted-foreground shrink-0" />
                            ) : (
                              <TooltipIcon icon={IdCard} tooltip="Physical SIM" className="h-5 w-5 text-muted-foreground shrink-0" />
                            )}
                            <span className={`font-mono text-sm break-all text-black dark:text-white ${card.status === 'inactive' || card.status === 'expired' || card.status === 'swapped' ? 'line-through' : ''}`}>{card.sim_number}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryModalCard(card);
                              }}
                              className="w-8 h-8 p-0 bg-blue-500 hover:bg-blue-600 text-white border-blue-500 hover:border-blue-600"
                              title="View History"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            {!card.isShared && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShareModalCard(card);
                                }}
                                className="w-8 h-8 p-0 bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
                                title="Share"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            )}

                            {!card.isShared && (
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
                            )}
                            
                            {!card.isShared && (
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
                            )}
                            
                            {!card.isShared && (
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
                            )}
                          </div>
                        </div>
                        
                        {/* Third line: Location (only if present) */}
                        {card.location && (
                          <div className="flex items-center gap-2">
                            <TooltipIcon icon={MapPin} tooltip="Device" />
                            <span className="text-sm text-black dark:text-white">{card.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Mobile Expanded content */}
                    {expandedRows.has(card.id) && (
                      <div className="px-4 pb-4 bg-table-green-light border-t border-table-divider animate-accordion-down">
                        <div className="space-y-3 pt-4">
                          {(card.login || card.account?.login) && (
                            <div className="flex items-center gap-2">
                              <TooltipIcon icon={User} tooltip="Login" />
                              <span className="font-mono text-sm break-all">{card.account?.login || card.login}</span>
                            </div>
                          )}
                          
                          {card.password && (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <TooltipIcon icon={Lock} tooltip="Password" />
                                <span className="font-mono text-sm break-all">
                                  {showPasswords[card.id] ? card.password : "•".repeat(card.password.length)}
                                  {showPasswords[card.id] ? card.password : "•".repeat(card.password.length)}
                                </span>
                              </div>
                              <TooltipIcon
                                icon={showPasswords[card.id] ? EyeOff : Eye}
                                tooltip={showPasswords[card.id] ? "Hide password" : "Show password"}
                                className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => togglePasswordVisibility(card.id)}
                              />
                            </div>
                          )}
                          
                          <EditableUsageTable
                            simCardId={card.id}
                            usageData={usageData[card.id] || []}
                            onUsageUpdate={handleUsageUpdate}
                          />

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <TooltipIcon icon={CalendarPlus} tooltip="Date Created" className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm text-muted-foreground">
                                {new Date(card.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TooltipIcon icon={CalendarClock} tooltip="Last Updated" className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm text-muted-foreground">
                                {new Date(card.updated_at).toLocaleString()}
                              </span>
                            </div>
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
                    <div className="flex-[1] text-center px-2 border-r border-black">Device</div>
                    <div className="flex-[1.5] text-center px-2">Actions</div>
                  </div>
                </div>
                <div className="divide-y divide-table-divider">
                  {filteredSimCards.map((card) => (
                    <div key={card.id} id={`sim-card-${card.id}`} className={`animate-fade-in ${highlightedCardId === card.id ? 'ring-2 ring-primary' : ''}`}>
                      <div 
                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => toggleRowExpansion(card.id)}
                      >
                        <div className="flex items-center w-full">
                          <div className="flex items-center gap-2 flex-[1.5] px-2 border-r border-black">
                            <TooltipIcon icon={Phone} tooltip="Phone Number" className="h-5 w-5 text-muted-foreground shrink-0" />
                            <span className={`font-mono truncate text-black dark:text-white ${card.status === 'inactive' || card.status === 'expired' || card.status === 'swapped' ? 'line-through' : ''}`}>{card.phone_number}</span>
                          </div>
                          <div className="flex items-center justify-center gap-2 flex-[2] px-2 border-r border-black">
                            {card.sim_type === 'eSIM' ? (
                              <TooltipIcon icon={Smartphone} tooltip="eSIM" className="h-5 w-5 text-muted-foreground shrink-0" />
                            ) : (
                              <TooltipIcon icon={IdCard} tooltip="Physical SIM" className="h-5 w-5 text-muted-foreground shrink-0" />
                            )}
                            <span className={`font-mono font-medium truncate text-black dark:text-white ${card.status === 'inactive' || card.status === 'expired' || card.status === 'swapped' ? 'line-through' : ''}`}>{card.sim_number}</span>
                          </div>
                          <div className="flex-[1] text-center px-2 border-r border-black">
                            <span className="text-black dark:text-white">{card.carrier || '-'}</span>
                          </div>
                          <div className="flex-[1] text-center px-2 border-r border-black flex flex-col items-center gap-1">
                            {renderStatusBadge(card)}
                            {card.isShared && <Badge variant="secondary" className="text-xs">Shared</Badge>}
                          </div>
                          <div className="flex-[1] text-center px-2 border-r border-black">
                            <span className="text-black dark:text-white text-sm">{card.location || '-'}</span>
                          </div>
                          <div className="flex-[1.5] flex justify-center items-center px-2">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHistoryModalCard(card);
                                }}
                                className="w-8 h-8 p-0 bg-blue-500 hover:bg-blue-600 text-white border-blue-500 hover:border-blue-600"
                                title="View History"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              {!card.isShared && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShareModalCard(card);
                                  }}
                                  className="w-8 h-8 p-0 bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
                                  title="Share"
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              )}
                              {!card.isShared && (
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
                              )}
                              
                              {!card.isShared && (
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
                              )}
                              
                              {!card.isShared && (
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
                              )}
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
                                <TooltipIcon icon={User} tooltip="Login" />
                                <span className="text-sm font-medium">Login:</span>
                                <span className="font-mono text-sm break-all">{card.account?.login || card.login}</span>
                              </div>
                            )}
                            
                            {card.password && (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <TooltipIcon icon={Lock} tooltip="Password" />
                                  <span className="text-sm font-medium">Password:</span>
                                  <span className="font-mono text-sm break-all">
                                    {showPasswords[card.id] ? card.password : "•".repeat(card.password.length)}
                                  </span>
                                </div>
                                <TooltipIcon
                                  icon={showPasswords[card.id] ? EyeOff : Eye}
                                  tooltip={showPasswords[card.id] ? "Hide password" : "Show password"}
                                  className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={() => togglePasswordVisibility(card.id)}
                                />
                              </div>
                            )}
                            
                            {card.carrier && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Carrier:</span>
                                <span className="text-sm text-muted-foreground">{card.carrier}</span>
                              </div>
                            )}
                            
                            {card.location && (
                              <div className="flex items-center gap-2">
                                <TooltipIcon icon={MapPin} tooltip="Location" />
                                <span className="text-sm font-medium">Location:</span>
                                <span className="text-sm text-muted-foreground">{card.location}</span>
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
                              <TooltipIcon icon={CalendarPlus} tooltip="Date Created" className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium">Created:</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(card.created_at).toLocaleString()}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <TooltipIcon icon={CalendarClock} tooltip="Last Updated" className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium">Last Updated:</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(card.updated_at).toLocaleString()}
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

      {/* History Modal */}
      {historyModalCard && (
        <SimCardHistoryModal
          isOpen={!!historyModalCard}
          onClose={() => setHistoryModalCard(null)}
          simCardId={historyModalCard.id}
          phoneNumber={historyModalCard.phone_number}
          createdAt={historyModalCard.created_at}
          updatedAt={historyModalCard.updated_at}
        />
      )}
    </div>
    </TooltipProvider>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Search, Check, X, Trash2, Mail } from "lucide-react";

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
}

interface FriendDisplay {
  friendshipId: string;
  friendUserId: string;
  friendEmail: string;
  friendName: string | null;
  status: string;
  isIncoming: boolean;
}

const Friends = () => {
  const [friends, setFriends] = useState<FriendDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }
      setUser(session.user);
      await fetchFriendships(session.user.id);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchFriendships = async (userId: string) => {
    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (error) {
      console.error("Error fetching friendships:", error);
      return;
    }

    if (!data || data.length === 0) {
      setFriends([]);
      return;
    }

    // Get all friend user IDs
    const friendUserIds = data.map((f: FriendshipRow) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );

    // Fetch profiles for these users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, profile_name, name")
      .in("user_id", friendUserIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p.profile_name || p.name])
    );

    // We need emails - use the find_user_by_email won't work here. 
    // Instead we'll show profile names or "User"
    const friendsList: FriendDisplay[] = data.map((f: FriendshipRow) => {
      const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      return {
        friendshipId: f.id,
        friendUserId: friendId,
        friendEmail: "", // Will be populated if available
        friendName: profileMap.get(friendId) || null,
        status: f.status,
        isIncoming: f.addressee_id === userId,
      };
    });

    setFriends(friendsList);
  };

  const handleSendRequest = async () => {
    if (!searchEmail.trim() || !user) return;
    setSearching(true);

    try {
      // Find user by email
      const { data: foundUsers, error: searchError } = await supabase
        .rpc("find_user_by_email", { search_email: searchEmail.trim().toLowerCase() });

      if (searchError) throw searchError;

      if (!foundUsers || foundUsers.length === 0) {
        toast({
          title: "User not found",
          description: "No account found with that email address.",
          variant: "destructive",
        });
        return;
      }

      const foundUser = foundUsers[0];

      // Check if friendship already exists
      const existing = friends.find(f => f.friendUserId === foundUser.user_id);
      if (existing) {
        toast({
          title: "Already connected",
          description: existing.status === "pending"
            ? "A friend request is already pending."
            : "This person is already your friend.",
        });
        return;
      }

      // Create friendship
      const { error: insertError } = await supabase
        .from("friendships")
        .insert({
          requester_id: user.id,
          addressee_id: foundUser.user_id,
          status: "pending",
        });

      if (insertError) {
        if (insertError.code === "23505") {
          toast({ title: "Friend request already exists" });
        } else {
          throw insertError;
        }
        return;
      }

      toast({ title: "Friend request sent!" });
      setSearchEmail("");
      await fetchFriendships(user.id);
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({
        title: "Error",
        description: "Failed to send friend request.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", friendshipId);

    if (error) {
      toast({ title: "Error", description: "Failed to accept request.", variant: "destructive" });
      return;
    }
    toast({ title: "Friend request accepted!" });
    await fetchFriendships(user.id);
  };

  const handleDecline = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", friendshipId);

    if (error) {
      toast({ title: "Error", description: "Failed to decline request.", variant: "destructive" });
      return;
    }
    toast({ title: "Friend request declined." });
    await fetchFriendships(user.id);
  };

  const handleRemove = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast({ title: "Error", description: "Failed to remove friend.", variant: "destructive" });
      return;
    }
    toast({ title: "Friend removed." });
    await fetchFriendships(user.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  const pendingIncoming = friends.filter(f => f.status === "pending" && f.isIncoming);
  const pendingOutgoing = friends.filter(f => f.status === "pending" && !f.isIncoming);
  const accepted = friends.filter(f => f.status === "accepted");

  return (
    <div className="min-h-screen bg-background pt-2">
      <div className="container mx-auto py-4 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Friends</h1>
        </div>

        {/* Add Friend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Add a Friend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter friend's email address"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSendRequest} disabled={searching || !searchEmail.trim()}>
                <Search className="h-4 w-4 mr-2" />
                {searching ? "Searching..." : "Send Request"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Incoming */}
        {pendingIncoming.length > 0 && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Pending Requests
                <Badge variant="default">{pendingIncoming.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingIncoming.map(f => (
                <div key={f.friendshipId} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                  <div>
                    <p className="font-medium">{f.friendName || "Unknown User"}</p>
                    <p className="text-sm text-muted-foreground">Wants to be your friend</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAccept(f.friendshipId)}>
                      <Check className="h-4 w-4 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDecline(f.friendshipId)}>
                      <X className="h-4 w-4 mr-1" /> Decline
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending Outgoing */}
        {pendingOutgoing.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sent Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingOutgoing.map(f => (
                <div key={f.friendshipId} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{f.friendName || "Unknown User"}</p>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(f.friendshipId)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Accepted Friends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Your Friends ({accepted.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accepted.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No friends yet. Send a request to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accepted.map(f => (
                  <div key={f.friendshipId} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <p className="font-medium">{f.friendName || "Friend"}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemove(f.friendshipId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Friends;

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Share2, Users } from "lucide-react";

interface Friend {
  friendUserId: string;
  friendName: string | null;
}

interface ShareSimCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  simCardId: string;
  phoneNumber: string;
}

export function ShareSimCardModal({ isOpen, onClose, simCardId, phoneNumber }: ShareSimCardModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sharedWith, setSharedWith] = useState<Set<string>>(new Set());
  const [initialShared, setInitialShared] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, simCardId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      // Fetch accepted friends
      const { data: friendships } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      const friendIds = (friendships || []).map(f =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );

      // Fetch profiles
      const { data: profiles } = friendIds.length > 0
        ? await supabase.from("profiles").select("user_id, profile_name, name").in("user_id", friendIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.profile_name || p.name]));
      setFriends(friendIds.map(id => ({ friendUserId: id, friendName: profileMap.get(id) || "Friend" })));

      // Fetch current shares
      const { data: shares } = await supabase
        .from("sim_card_shares")
        .select("shared_with_id")
        .eq("sim_card_id", simCardId);

      const currentShared = new Set((shares || []).map(s => s.shared_with_id));
      setSharedWith(currentShared);
      setInitialShared(new Set(currentShared));
    } catch (error) {
      console.error("Error loading share data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (friendId: string) => {
    setSharedWith(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const toAdd = [...sharedWith].filter(id => !initialShared.has(id));
      const toRemove = [...initialShared].filter(id => !sharedWith.has(id));

      // Add new shares
      if (toAdd.length > 0) {
        const { error } = await supabase.from("sim_card_shares").insert(
          toAdd.map(id => ({
            sim_card_id: simCardId,
            owner_id: session.user.id,
            shared_with_id: id,
          }))
        );
        if (error) throw error;

        // Log sharing events in history
        for (const friendId of toAdd) {
          const friendName = friends.find(f => f.friendUserId === friendId)?.friendName || "a friend";
          await supabase.from("sim_card_history").insert({
            sim_card_id: simCardId,
            event_type: "field_edit",
            changed_by: session.user.id,
            notes: `Shared with ${friendName}`,
          });
        }
      }

      // Remove shares
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("sim_card_shares")
          .delete()
          .eq("sim_card_id", simCardId)
          .in("shared_with_id", toRemove);
        if (error) throw error;

        for (const friendId of toRemove) {
          const friendName = friends.find(f => f.friendUserId === friendId)?.friendName || "a friend";
          await supabase.from("sim_card_history").insert({
            sim_card_id: simCardId,
            event_type: "field_edit",
            changed_by: session.user.id,
            notes: `Unshared from ${friendName}`,
          });
        }
      }

      toast({ title: "Sharing updated!" });
      onClose();
    } catch (error) {
      console.error("Error saving shares:", error);
      toast({ title: "Error", description: "Failed to update sharing.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share: {phoneNumber}
          </DialogTitle>
          <DialogDescription>
            Select friends to share this SIM card with (view only).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading friends...</div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No friends yet. Add friends first to share SIM cards.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map(f => (
              <label
                key={f.friendUserId}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={sharedWith.has(f.friendUserId)}
                  onCheckedChange={() => handleToggle(f.friendUserId)}
                />
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{f.friendName}</span>
                </div>
              </label>
            ))}
            <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { History, UserPlus, UserMinus, FileEdit, Plus, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoryEntry {
  id: string;
  type: "created" | "updated" | "ownership_transfer" | "location_change";
  timestamp: string;
  details?: string;
  previousUserId?: string;
  newUserId?: string;
  changedBy?: string;
  notes?: string;
  oldValue?: string;
  newValue?: string;
}
interface SimCardHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  simCardId: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export function SimCardHistoryModal({
  isOpen,
  onClose,
  simCardId,
  phoneNumber,
  createdAt,
  updatedAt,
}: SimCardHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && simCardId) {
      fetchHistory();
    }
  }, [isOpen, simCardId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Fetch ownership transfers from sim_card_history
      const { data: transfers, error } = await supabase
        .from("sim_card_history")
        .select("*")
        .eq("sim_card_id", simCardId)
        .order("changed_at", { ascending: false });

      if (error) {
        console.error("Error fetching history:", error);
      }

      // Build timeline entries
      const entries: HistoryEntry[] = [];

      // Add ownership transfers
      if (transfers && transfers.length > 0) {
        transfers.forEach((transfer) => {
          entries.push({
            id: transfer.id,
            type: (transfer.event_type || "ownership_transfer") as HistoryEntry["type"],
            timestamp: transfer.changed_at,
            previousUserId: transfer.previous_user_id,
            newUserId: transfer.new_user_id,
            changedBy: transfer.changed_by,
            notes: transfer.notes,
            oldValue: transfer.old_value,
            newValue: transfer.new_value,
          });
        });
      }

      // Add last updated entry if different from created
      if (updatedAt !== createdAt) {
        entries.push({
          id: "updated",
          type: "updated",
          timestamp: updatedAt,
          details: "SIM card details were modified",
        });
      }

      // Add created entry
      entries.push({
        id: "created",
        type: "created",
        timestamp: createdAt,
        details: "SIM card was added to the system",
      });

      // Sort by timestamp ascending (oldest first)
      entries.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setHistory(entries);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: HistoryEntry["type"]) => {
    switch (type) {
      case "created":
        return <Plus className="h-4 w-4" />;
      case "updated":
        return <FileEdit className="h-4 w-4" />;
      case "ownership_transfer":
        return <UserPlus className="h-4 w-4" />;
      case "location_change":
        return <MapPin className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getTitle = (entry: HistoryEntry) => {
    switch (entry.type) {
      case "created":
        return "SIM Card Created";
      case "updated":
        return "Details Updated";
      case "ownership_transfer":
        return "Ownership Transferred";
      case "location_change":
        return "Location Changed";
      default:
        return "Change";
    }
  };

  const getIconBgColor = (type: HistoryEntry["type"]) => {
    switch (type) {
      case "created":
        return "bg-green-500";
      case "updated":
        return "bg-blue-500";
      case "ownership_transfer":
        return "bg-purple-500";
      case "location_change":
        return "bg-amber-500";
      default:
        return "bg-muted";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            History: {phoneNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No history available</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

              <div className="space-y-6">
                {history.map((entry, index) => (
                  <div key={entry.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white ${getIconBgColor(
                        entry.type
                      )}`}
                    >
                      {getIcon(entry.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-sm">
                          {getTitle(entry)}
                        </h4>
                        <time className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </time>
                      </div>

                      {entry.type === "ownership_transfer" && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          <p>SIM card was transferred to a new owner</p>
                          {entry.notes && (
                            <p className="mt-1 italic">Note: {entry.notes}</p>
                          )}
                        </div>
                      )}

                      {entry.type === "location_change" && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          <p>
                            <span className="font-medium">{entry.oldValue}</span>
                            {" → "}
                            <span className="font-medium">{entry.newValue}</span>
                          </p>
                        </div>
                      )}

                      {entry.details && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {entry.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

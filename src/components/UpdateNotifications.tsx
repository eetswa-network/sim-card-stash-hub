import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, Bug, Shield, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Update {
  id: string;
  title: string;
  description: string;
  update_type: 'feature' | 'bugfix' | 'improvement' | 'security';
  version: string;
  created_at: string;
}

interface UpdateNotificationsProps {
  userId: string;
}

export function UpdateNotifications({ userId }: UpdateNotificationsProps) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUnseenUpdates();
  }, [userId]);

  const fetchUnseenUpdates = async () => {
    try {
      // Get all active updates
      const { data: allUpdates, error: updatesError } = await supabase
        .from("app_updates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (updatesError) throw updatesError;

      // Get updates user has already seen
      const { data: seenUpdates, error: seenError } = await supabase
        .from("user_update_views")
        .select("update_id")
        .eq("user_id", userId);

      if (seenError) throw seenError;

      // Filter out updates user has already seen
      const seenUpdateIds = seenUpdates?.map(view => view.update_id) || [];
      const unseenUpdates = (allUpdates?.filter(update => 
        !seenUpdateIds.includes(update.id)
      ) || []) as Update[];

      setUpdates(unseenUpdates);
      setVisible(unseenUpdates.length > 0);
    } catch (error) {
      console.error("Error fetching updates:", error);
    } finally {
      setLoading(false);
    }
  };

  const markUpdatesAsSeen = async () => {
    try {
      const viewRecords = updates.map(update => ({
        user_id: userId,
        update_id: update.id
      }));

      const { error } = await supabase
        .from("user_update_views")
        .insert(viewRecords);

      if (error) throw error;

      setVisible(false);
      
      toast({
        title: "Updates marked as read",
        description: "You won't see these updates again."
      });
    } catch (error) {
      console.error("Error marking updates as seen:", error);
      toast({
        title: "Error",
        description: "Failed to mark updates as read.",
        variant: "destructive"
      });
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="h-4 w-4" />;
      case 'bugfix':
        return <Bug className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'improvement':
        return <Zap className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getUpdateColor = (type: string) => {
    switch (type) {
      case 'feature':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'bugfix':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'security':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'improvement':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading || !visible || updates.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                What's New
              </h3>
              <Badge variant="secondary" className="text-xs">
                {updates.length} update{updates.length > 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="space-y-3">
              {updates.map((update) => (
                <div key={update.id} className="flex items-start gap-3">
                  <div className={`p-1 rounded-full ${getUpdateColor(update.update_type)}`}>
                    {getUpdateIcon(update.update_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                        {update.title}
                      </h4>
                      {update.version && (
                        <Badge variant="outline" className="text-xs">
                          {update.version}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {update.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                onClick={markUpdatesAsSeen}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Got it!
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={markUpdatesAsSeen}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
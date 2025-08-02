import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bug, Shield, Zap, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Update {
  id: string;
  title: string;
  description: string;
  update_type: 'feature' | 'bugfix' | 'improvement' | 'security';
  version: string;
  created_at: string;
  is_active: boolean;
}

export default function Updates() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetchUpdates();
  }, []);

  const checkAuthAndFetchUpdates = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await fetchAllUpdates();
    } catch (error) {
      console.error("Error checking auth:", error);
      navigate("/auth");
    }
  };

  const fetchAllUpdates = async () => {
    try {
      const { data: allUpdates, error } = await supabase
        .from("app_updates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUpdates((allUpdates || []) as Update[]);
    } catch (error) {
      console.error("Error fetching updates:", error);
      toast({
        title: "Error",
        description: "Failed to load updates.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="h-5 w-5" />;
      case 'bugfix':
        return <Bug className="h-5 w-5" />;
      case 'security':
        return <Shield className="h-5 w-5" />;
      case 'improvement':
        return <Zap className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
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

  const getUpdateTypeLabel = (type: string) => {
    switch (type) {
      case 'feature':
        return 'New Feature';
      case 'bugfix':
        return 'Bug Fix';
      case 'security':
        return 'Security Update';
      case 'improvement':
        return 'Improvement';
      default:
        return 'Update';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading updates...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">App Updates</h1>
          <p className="text-muted-foreground">
            Stay up to date with the latest features, improvements, and fixes
          </p>
        </div>

        {updates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No updates yet</h3>
              <p className="text-muted-foreground">
                Check back later for the latest app updates
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {updates.map((update) => (
              <Card key={update.id} className={`${!update.is_active ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getUpdateColor(update.update_type)}`}>
                        {getUpdateIcon(update.update_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl">{update.title}</CardTitle>
                          {!update.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(update.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                          <Badge variant="outline" className={getUpdateColor(update.update_type)}>
                            {getUpdateTypeLabel(update.update_type)}
                          </Badge>
                          {update.version && (
                            <Badge variant="outline">
                              v{update.version}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {update.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
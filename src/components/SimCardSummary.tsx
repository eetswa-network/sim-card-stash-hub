import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Phone, CreditCard, BarChart3 } from "lucide-react";

interface SimCardStats {
  total: number;
  active: number;
  inactive: number;
  expired: number;
}

export default function SimCardSummary() {
  const [stats, setStats] = useState<SimCardStats>({
    total: 0,
    active: 0,
    inactive: 0,
    expired: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSimCardStats();
  }, []);

  const fetchSimCardStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data: simCards, error } = await supabase
        .from("sim_cards")
        .select("status")
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error fetching SIM card stats:", error);
        setLoading(false);
        return;
      }

      const statCounts = simCards.reduce(
        (acc, card) => {
          acc.total++;
          const status = card.status || 'active';
          if (status === 'active') acc.active++;
          else if (status === 'inactive') acc.inactive++;
          else if (status === 'expired') acc.expired++;
          return acc;
        },
        { total: 0, active: 0, inactive: 0, expired: 0 }
      );

      setStats(statCounts);
    } catch (error) {
      console.error("Error fetching SIM card stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-4">Loading statistics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          SIM Card Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Phone Numbers</TableHead>
              <TableHead>SIM Cards</TableHead>
              <TableHead className="text-right">Percentage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <Badge variant={getStatusVariant('active')} className="flex items-center gap-1 w-fit">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Active
                </Badge>
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {stats.active}
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {stats.active}
              </TableCell>
              <TableCell className="text-right">
                {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Badge variant={getStatusVariant('inactive')} className="flex items-center gap-1 w-fit">
                  <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                  Inactive
                </Badge>
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {stats.inactive}
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {stats.inactive}
              </TableCell>
              <TableCell className="text-right">
                {stats.total > 0 ? ((stats.inactive / stats.total) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Badge variant={getStatusVariant('expired')} className="flex items-center gap-1 w-fit">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Expired
                </Badge>
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {stats.expired}
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {stats.expired}
              </TableCell>
              <TableCell className="text-right">
                {stats.total > 0 ? ((stats.expired / stats.total) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
            <TableRow className="font-semibold border-t-2">
              <TableCell>
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                  Total
                </Badge>
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {stats.total}
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {stats.total}
              </TableCell>
              <TableCell className="text-right">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
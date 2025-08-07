import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Phone, CreditCard, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

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

  // Prepare data for pie chart
  const pieData = [
    { name: 'Active', value: stats.active, color: '#22c55e' },
    { name: 'Inactive', value: stats.inactive, color: '#6b7280' },
    { name: 'Expired', value: stats.expired, color: '#ef4444' }
  ].filter(item => item.value > 0); // Only show segments with data

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show labels for very small slices

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Pie Chart */}
      {stats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              SIM Card Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'SIM Cards']}
                    labelFormatter={(label) => `${label} Status`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Table */}
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
    </div>
  );
}
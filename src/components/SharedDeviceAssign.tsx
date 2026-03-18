import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface SharedDeviceAssignProps {
  simCardId: string;
  currentDevice?: string;
}

export function SharedDeviceAssign({ simCardId, currentDevice }: SharedDeviceAssignProps) {
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState(currentDevice || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadDevices = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from("sim_card_locations")
        .select("name")
        .eq("user_id", session.user.id)
        .order("name");

      setDevices((data || []).map(d => d.name));
    };
    loadDevices();
  }, []);

  useEffect(() => {
    setSelectedDevice(currentDevice || "");
  }, [currentDevice]);

  const handleAssign = async (value: string) => {
    const deviceName = value === "__none__" ? null : value;
    setSelectedDevice(deviceName || "");
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from("sim_card_shares")
        .update({ device_name: deviceName })
        .eq("sim_card_id", simCardId)
        .eq("shared_with_id", session.user.id);

      if (error) throw error;
      toast({ title: deviceName ? `Assigned to ${deviceName}` : "Device removed" });
    } catch (error) {
      console.error("Error assigning device:", error);
      toast({ title: "Error", description: "Failed to assign device.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (devices.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium shrink-0">My Device:</span>
      <Select value={selectedDevice || "__none__"} onValueChange={handleAssign} disabled={saving}>
        <SelectTrigger className="h-8 text-sm w-[180px]">
          <SelectValue placeholder="Assign device..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">None</SelectItem>
          {devices.map(d => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

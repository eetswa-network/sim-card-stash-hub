import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Plus, Trash2, Pencil, Check, X, Camera, Phone, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface DeviceLocation {
  id: string;
  name: string;
  image_url: string | null;
}

interface SimCardOnDevice {
  id: string;
  phone_number: string;
  sim_number: string;
  carrier: string | null;
  status: string | null;
  sim_type: string;
}

interface FriendDeviceEntry {
  deviceName: string;
  friendName: string;
  simCards: SimCardOnDevice[];
}

export default function Devices() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<DeviceLocation[]>([]);
  const [simCardsByDevice, setSimCardsByDevice] = useState<Record<string, SimCardOnDevice[]>>({});
  const [friendDevices, setFriendDevices] = useState<FriendDeviceEntry[]>([]);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [addingDevice, setAddingDevice] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      const [devicesResult, simCardsResult, sharesResult] = await Promise.all([
        supabase
          .from("sim_card_locations")
          .select("id, name, image_url")
          .eq("user_id", session.user.id)
          .order("name"),
        supabase
          .from("sim_cards")
          .select("id, phone_number, sim_number, carrier, status, sim_type, location")
          .eq("user_id", session.user.id),
        // Get shares where I'm the owner and the friend has assigned a device
        supabase
          .from("sim_card_shares")
          .select("sim_card_id, shared_with_id, device_name")
          .eq("owner_id", session.user.id)
          .not("device_name", "is", null)
      ]);

      const deviceList = devicesResult.data || [];
      setDevices(deviceList);

      // Group SIM cards by device name
      const grouped: Record<string, SimCardOnDevice[]> = {};
      for (const device of deviceList) {
        grouped[device.name] = [];
      }
      for (const sim of (simCardsResult.data || [])) {
        if (sim.location && grouped[sim.location]) {
          grouped[sim.location].push(sim);
        }
      }
      setSimCardsByDevice(grouped);

      // Build friend device entries
      const shares = sharesResult.data || [];
      if (shares.length > 0) {
        const friendIds = [...new Set(shares.map(s => s.shared_with_id))];
        const simCardIds = [...new Set(shares.map(s => s.sim_card_id))];

        const [profilesResult, sharedSimsResult] = await Promise.all([
          supabase.from("profiles").select("user_id, profile_name, name").in("user_id", friendIds),
          supabase.from("sim_cards").select("id, phone_number, sim_number, carrier, status, sim_type").in("id", simCardIds)
        ]);

        const profileMap = new Map((profilesResult.data || []).map(p => [p.user_id, p.profile_name || p.name || "Friend"]));
        const simMap = new Map((sharedSimsResult.data || []).map(s => [s.id, s]));

        // Group by device_name + friend
        const deviceMap = new Map<string, FriendDeviceEntry>();
        for (const share of shares) {
          const key = `${share.device_name}__${share.shared_with_id}`;
          if (!deviceMap.has(key)) {
            deviceMap.set(key, {
              deviceName: share.device_name!,
              friendName: profileMap.get(share.shared_with_id) || "Friend",
              simCards: [],
            });
          }
          const sim = simMap.get(share.sim_card_id);
          if (sim) {
            deviceMap.get(key)!.simCards.push(sim);
          }
        }
        setFriendDevices(Array.from(deviceMap.values()));
      } else {
        setFriendDevices([]);
      }
    } catch (error) {
      console.error("Error loading devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    if (!user || !newDeviceName.trim()) return;
    setAddingDevice(true);
    try {
      const { data, error } = await supabase
        .from("sim_card_locations")
        .insert([{ name: newDeviceName.trim(), user_id: user.id }])
        .select("id, name, image_url")
        .single();
      if (error) throw error;
      setDevices(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSimCardsByDevice(prev => ({ ...prev, [data.name]: [] }));
      setNewDeviceName("");
      toast({ title: "Device added" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to add device. It may already exist.", variant: "destructive" });
    } finally {
      setAddingDevice(false);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      const { error } = await supabase
        .from("sim_card_locations")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setDevices(prev => prev.filter(d => d.id !== id));
      toast({ title: "Device removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete device.", variant: "destructive" });
    }
  };

  const handleRenameDevice = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    try {
      const { error } = await supabase
        .from("sim_card_locations")
        .update({ name: trimmed })
        .eq("id", id);
      if (error) throw error;
      setDevices(prev => prev.map(d => d.id === id ? { ...d, name: trimmed } : d).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingId(null);
      setEditingName("");
      toast({ title: "Device updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to rename device.", variant: "destructive" });
    }
  };

  const handleImageUpload = async (deviceId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
      return;
    }

    setUploadingId(deviceId);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${deviceId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("device-images")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("device-images")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("sim_card_locations")
        .update({ image_url: publicUrl })
        .eq("id", deviceId);
      if (updateError) throw updateError;

      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, image_url: publicUrl } : d));
      toast({ title: "Device image updated" });
    } catch (error) {
      console.error("Error uploading device image:", error);
      toast({ title: "Upload failed", description: "Failed to upload device image.", variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading devices...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Devices</h1>
          <p className="text-muted-foreground">
            Manage your devices and see which SIM cards are assigned to each one.
          </p>
        </div>

        {/* Add new device */}
        <div className="flex gap-2 mb-6">
          <Input
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
            placeholder="Add new device..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddDevice();
              }
            }}
          />
          <Button
            onClick={handleAddDevice}
            disabled={addingDevice || !newDeviceName.trim()}
            size="sm"
            className="gap-1 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Device list */}
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No devices added yet. Add one above to get started.</p>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <Card key={device.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    {/* Device image */}
                    <div className="relative shrink-0">
                      <Avatar className="h-16 w-16 rounded-lg">
                        <AvatarImage src={device.image_url || ""} className="object-contain" />
                        <AvatarFallback className="rounded-lg bg-muted">
                          <Smartphone className="h-8 w-8 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor={`device-image-${device.id}`}
                        className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors"
                      >
                        <Camera className="h-3 w-3" />
                      </label>
                      <input
                        id={`device-image-${device.id}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(device.id, e)}
                        disabled={uploadingId === device.id}
                      />
                    </div>

                    {/* Device name */}
                    <div className="flex-1 min-w-0">
                      {editingId === device.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); handleRenameDevice(device.id); }
                              if (e.key === "Escape") { setEditingId(null); }
                            }}
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleRenameDevice(device.id)} className="h-8 w-8 p-0 text-primary shrink-0">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-8 w-8 p-0 shrink-0">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <CardTitle className="text-lg">{device.name}</CardTitle>
                      )}
                    </div>

                    {/* Actions */}
                    {editingId !== device.id && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingId(device.id); setEditingName(device.name); }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Device?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{device.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteDevice(device.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* SIM cards on this device */}
                  {(simCardsByDevice[device.name] || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No SIM cards assigned to this device.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned SIM Cards</p>
                      {(simCardsByDevice[device.name] || []).map((sim) => (
                        <div key={sim.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/40 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-mono">{sim.phone_number}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground truncate">{sim.carrier || "No carrier"}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{sim.sim_type}</span>
                          {sim.status && sim.status !== "active" && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{sim.status}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

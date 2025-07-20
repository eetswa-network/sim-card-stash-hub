import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, Trash2 } from "lucide-react";

interface SimCardFormProps {
  onSuccess: () => void;
  editingCard?: any;
  onCancel?: () => void;
}

export function SimCardForm({ onSuccess, editingCard, onCancel }: SimCardFormProps) {
  const [formData, setFormData] = useState({
    sim_number: editingCard?.sim_number || "",
    phone_number: editingCard?.phone_number || "",
    carrier: editingCard?.carrier || "",
    status: editingCard?.status || "active",
    sim_type: editingCard?.sim_type || "Physical SIM",
    notes: editingCard?.notes || "",
    login: editingCard?.login || "",
    password: editingCard?.password || "",
  });
  const [usedForEntries, setUsedForEntries] = useState([{ name: "", use_purpose: "" }]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [existingCarriers, setExistingCarriers] = useState<string[]>([]);
  const [showCustomCarrier, setShowCustomCarrier] = useState(false);
  const [customCarrier, setCustomCarrier] = useState("");
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Get the user's profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setProfile(profileData);

        // Load existing carriers for this user
        const { data: carriersData } = await supabase
          .from("sim_cards")
          .select("carrier")
          .eq("user_id", user.id)
          .not("carrier", "is", null)
          .not("carrier", "eq", "");
        
        if (carriersData) {
          const uniqueCarriers = [...new Set(carriersData.map(item => item.carrier))].filter(Boolean);
          setExistingCarriers(uniqueCarriers);
        }
      }
    };
    getUser();

    // Load existing used for entries if editing
    if (editingCard) {
      const loadUsedForEntries = async () => {
        const { data } = await supabase
          .from("sim_card_usage")
          .select("*")
          .eq("sim_card_id", editingCard.id);
        
        if (data && data.length > 0) {
          setUsedForEntries(data.map(entry => ({ name: entry.name, use_purpose: entry.use_purpose })));
        }
      };
      loadUsedForEntries();
    }
  }, [editingCard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to save SIM cards.",
          variant: "destructive",
        });
        return;
      }

      let simCardId = editingCard?.id;

      if (editingCard) {
        const { error } = await supabase
          .from("sim_cards")
          .update(formData)
          .eq("id", editingCard.id);

        if (error) throw error;

        // Delete existing usage entries
        await supabase
          .from("sim_card_usage")
          .delete()
          .eq("sim_card_id", editingCard.id);
      } else {
        const { data, error } = await supabase
          .from("sim_cards")
          .insert([{ ...formData, user_id: user.id, profile_id: profile?.id }])
          .select()
          .single();

        if (error) throw error;
        simCardId = data.id;
      }

      // Insert new usage entries (only non-empty ones)
      const validUsedForEntries = usedForEntries.filter(entry => entry.name.trim() && entry.use_purpose.trim());
      if (validUsedForEntries.length > 0) {
        const { error: usageError } = await supabase
          .from("sim_card_usage")
          .insert(validUsedForEntries.map(entry => ({
            sim_card_id: simCardId,
            name: entry.name,
            use_purpose: entry.use_purpose,
            user_id: user.id
          })));

        if (usageError) throw usageError;
      }

      toast({ title: editingCard ? "SIM card updated successfully!" : "SIM card added successfully!" });

      setFormData({
        sim_number: "",
        phone_number: "",
        carrier: "",
        status: "active",
        sim_type: "Physical SIM",
        notes: "",
        login: "",
        password: "",
      });
      setUsedForEntries([{ name: "", use_purpose: "" }]);
      onSuccess();
    } catch (error: any) {
      console.error("Error saving SIM card:", error);
      
      let errorMessage = "Failed to save SIM card. Please try again.";
      if (error?.code === "23505" && error?.message?.includes("sim_cards_sim_number_key")) {
        errorMessage = "A SIM card with this SIM number already exists. Please use a different SIM number.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>{editingCard ? "Edit SIM Card" : "Add New SIM Card"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            <div className="space-y-2">
              <Label htmlFor="sim_number">SIM Number *</Label>
              <Input
                id="sim_number"
                value={formData.sim_number}
                onChange={(e) => setFormData({ ...formData, sim_number: e.target.value })}
                placeholder="Enter SIM number"
                required
                className={isMobile ? "min-h-[44px]" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number *</Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="Enter phone number"
                required
                className={isMobile ? "min-h-[44px]" : ""}
              />
            </div>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier</Label>
              {showCustomCarrier ? (
                <div className="flex gap-2">
                  <Input
                    value={customCarrier}
                    onChange={(e) => setCustomCarrier(e.target.value)}
                    placeholder="Enter new carrier name"
                    className={`flex-1 ${isMobile ? "min-h-[44px]" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (customCarrier.trim()) {
                        setFormData({ ...formData, carrier: customCarrier.trim() });
                        if (!existingCarriers.includes(customCarrier.trim())) {
                          setExistingCarriers([...existingCarriers, customCarrier.trim()]);
                        }
                        setCustomCarrier("");
                        setShowCustomCarrier(false);
                      }
                    }}
                    className={isMobile ? "min-h-[44px]" : ""}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCustomCarrier(false);
                      setCustomCarrier("");
                    }}
                    className={isMobile ? "min-h-[44px]" : ""}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select 
                  value={formData.carrier} 
                  onValueChange={(value) => {
                    if (value === "add_new") {
                      setShowCustomCarrier(true);
                    } else {
                      setFormData({ ...formData, carrier: value });
                    }
                  }}
                >
                  <SelectTrigger className={isMobile ? "min-h-[44px]" : ""}>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCarriers.map((carrier) => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                    <SelectItem value="add_new">+ Add new...</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sim_type">SIM Type</Label>
              <Select value={formData.sim_type} onValueChange={(value) => setFormData({ ...formData, sim_type: value })}>
                <SelectTrigger className={isMobile ? "min-h-[44px]" : ""}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eSIM">eSIM</SelectItem>
                  <SelectItem value="Physical SIM">Physical SIM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className={isMobile ? "min-h-[44px]" : ""}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            <div className="space-y-2">
              <Label htmlFor="login">Login</Label>
              <Input
                id="login"
                type="text"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                placeholder="Account login/username"
                className={isMobile ? "min-h-[44px]" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Account password"
                className={isMobile ? "min-h-[44px]" : ""}
              />
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="show-password"
                  checked={showPassword}
                  onCheckedChange={(checked) => setShowPassword(checked === true)}
                  className={isMobile ? "w-5 h-5" : ""}
                />
                <Label htmlFor="show-password" className={`font-normal ${isMobile ? 'text-base' : 'text-sm'}`}>
                  Show password
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Used For</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUsedForEntries([...usedForEntries, { name: "", use_purpose: "" }])}
                className="px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </div>
            <div className="space-y-3">
              {usedForEntries.map((entry, index) => (
                <div key={index} className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} items-end`}>
                  <div className="space-y-2">
                    <Label htmlFor={`name-${index}`}>Name</Label>
                    <Input
                      id={`name-${index}`}
                      value={entry.name}
                      onChange={(e) => {
                        const updated = [...usedForEntries];
                        updated[index].name = e.target.value;
                        setUsedForEntries(updated);
                      }}
                      placeholder="Enter name"
                      className={isMobile ? "min-h-[44px]" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`use-${index}`}>Use</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`use-${index}`}
                        value={entry.use_purpose}
                        onChange={(e) => {
                          const updated = [...usedForEntries];
                          updated[index].use_purpose = e.target.value;
                          setUsedForEntries(updated);
                        }}
                        placeholder="Enter use purpose"
                        className={`flex-1 ${isMobile ? "min-h-[44px]" : ""}`}
                      />
                      {usedForEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = usedForEntries.filter((_, i) => i !== index);
                            setUsedForEntries(updated);
                          }}
                          className={`px-3 ${isMobile ? "min-h-[44px]" : ""}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this SIM card"
              rows={isMobile ? 4 : 3}
              className={isMobile ? "min-h-[100px]" : ""}
            />
          </div>

          <div className={`flex gap-3 ${isMobile ? 'flex-col' : ''}`}>
            <Button 
              type="submit" 
              disabled={loading}
              className={isMobile ? "min-h-[48px] w-full" : "flex-1"}
            >
              {loading ? "Saving..." : editingCard ? "Update" : "Add SIM Card"}
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className={isMobile ? "min-h-[48px] w-full" : "flex-1"}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
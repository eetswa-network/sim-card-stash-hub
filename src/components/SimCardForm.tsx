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
    profile_name: editingCard?.profile_name || "",
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
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
      }
    };
    getUser();
  }, []);

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

      if (editingCard) {
        // Extract profile_name before updating sim_cards
        const { profile_name, ...simCardData } = formData;
        const { error } = await supabase
          .from("sim_cards")
          .update(simCardData)
          .eq("id", editingCard.id);

        if (error) throw error;
        toast({ title: "SIM card updated successfully!" });
      } else {
        // Extract profile_name before inserting into sim_cards
        const { profile_name, ...simCardData } = formData;
        const { error } = await supabase
          .from("sim_cards")
          .insert([{ ...simCardData, user_id: user.id, profile_id: profile?.id }]);

        if (error) throw error;
        toast({ title: "SIM card added successfully!" });
      }

      setFormData({
        sim_number: "",
        phone_number: "",
        carrier: "",
        status: "active",
        sim_type: "Physical SIM",
        notes: "",
        login: "",
        password: "",
        profile_name: "",
      });
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
              <Input
                id="carrier"
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                placeholder="e.g., Verizon, AT&T, T-Mobile"
                className={isMobile ? "min-h-[44px]" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sim_type">SIM Type</Label>
              <Select value={formData.sim_type} onValueChange={(value) => setFormData({ ...formData, sim_type: value })}>
                <SelectTrigger className={isMobile ? "min-h-[44px]" : ""}>
                  <SelectValue placeholder="Select SIM type" />
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

          <div className="space-y-2">
            <Label htmlFor="profile_name">Profile Name</Label>
            <Input
              id="profile_name"
              value={formData.profile_name}
              onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
              placeholder="Profile or account name"
              className={isMobile ? "min-h-[44px]" : ""}
            />
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
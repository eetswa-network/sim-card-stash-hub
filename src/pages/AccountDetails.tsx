import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, User, Mail, Sun, Moon, Monitor, MapPin, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string()
    .trim()
    .max(100, "Name must be less than 100 characters")
    .optional(),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
});

interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  profile_name: string | null;
  avatar_url: string | null;
}

export default function AccountDetails() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

  const checkAuthAndLoadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      setFormData({
        name: "",
        email: session.user.email || ""
      });

      // Load user profile
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (profileData) {
        setProfile(profileData);
        setFormData(prev => ({
          ...prev,
          name: profileData.name || profileData.profile_name || ""
        }));
      }

      // Load locations
      const { data: locationsData } = await supabase
        .from("sim_card_locations")
        .select("id, name")
        .eq("user_id", session.user.id)
        .order("name");
      
      setLocations(locationsData || []);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Validate inputs
      const validatedData = profileSchema.parse(formData);

      // Update email if it has changed
      if (validatedData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: validatedData.email
        });

        if (emailError) throw emailError;

        toast({
          title: "Email updated",
          description: "Please check your new email address for a confirmation link."
        });
      }

      // Update or create profile
      const profileUpdate = {
        user_id: user.id,
        name: validatedData.name || null,
        profile_name: validatedData.name || null
      };

      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert(profileUpdate);

        if (error) throw error;

        // Reload profile after creation
        await checkAuthAndLoadProfile();
      }

      toast({
        title: "Profile updated",
        description: "Your account details have been saved successfully."
      });

      // Navigate back to dashboard
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        console.error("Error saving profile:", error);
        toast({
          title: "Error",
          description: "Failed to save profile changes.",
          variant: "destructive"
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const profileUpdate = {
        user_id: user.id,
        name: profile?.name || formData.name || null,
        profile_name: profile?.profile_name || formData.name || null,
        avatar_url: publicUrl
      };

      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert(profileUpdate);

        if (error) throw error;
      }

      // Reload profile to show new avatar
      await checkAuthAndLoadProfile();

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully."
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const handleAddLocation = async () => {
    if (!user || !newLocationName.trim()) return;
    setAddingLocation(true);
    try {
      const { data, error } = await supabase
        .from("sim_card_locations")
        .insert([{ name: newLocationName.trim(), user_id: user.id }])
        .select("id, name")
        .single();
      if (error) throw error;
      setLocations(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewLocationName("");
      toast({ title: "Location added" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to add location. It may already exist.", variant: "destructive" });
    } finally {
      setAddingLocation(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("sim_card_locations")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setLocations(prev => prev.filter(l => l.id !== id));
      toast({ title: "Location removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete location.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading account details...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Details</h1>
          <p className="text-muted-foreground">
            Manage your profile information and settings
          </p>
        </div>

        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-lg">
                    {getInitials(profile?.name || profile?.profile_name, formData.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1">
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-colors">
                      <Camera className="h-4 w-4" />
                    </div>
                  </Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </div>
              </div>
              <div>
                <h3 className="font-medium">Profile Picture</h3>
                <p className="text-sm text-muted-foreground">
                  Click the camera icon to upload a new picture
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max size: 5MB. Formats: JPG, PNG, GIF
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your display name"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Changing your email will require confirmation
                </p>
              </div>

              {/* Theme Selection */}
              <div>
                <Label>Theme Preference</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {/* Light Theme Tile */}
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-muted/50 ${
                      theme === 'light' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border'
                    }`}
                  >
                    <Sun className="h-6 w-6" />
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  
                  {/* Dark Theme Tile */}
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-muted/50 ${
                      theme === 'dark' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border'
                    }`}
                  >
                    <Moon className="h-6 w-6" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  
                  {/* System Theme Tile */}
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-muted/50 ${
                      theme === 'system' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border'
                    }`}
                  >
                    <Monitor className="h-6 w-6" />
                    <span className="text-sm font-medium">Auto</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Choose your preferred theme or use system settings
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSaveProfile}
                disabled={saving || uploading}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Location / Device Management Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location / Device
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage your list of locations and devices for SIM card assignment.
            </p>

            {/* Add new location */}
            <div className="flex gap-2">
              <Input
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Add new location / device..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLocation();
                  }
                }}
              />
              <Button
                onClick={handleAddLocation}
                disabled={addingLocation || !newLocationName.trim()}
                size="sm"
                className="gap-1 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {/* Location list */}
            {locations.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No custom locations added yet.</p>
            ) : (
              <div className="space-y-2">
                {locations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{loc.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
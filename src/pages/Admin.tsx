import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, User, Edit, Save, X, Phone, IdCard, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userSimCards, setUserSimCards] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserSimCards(selectedUser.id);
    }
  }, [selectedUser]);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }

      // Check if user is super admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You do not have permission to access this page.",
          variant: "destructive",
        });
        navigate("/", { replace: true });
        return;
      }

      setIsSuperAdmin(true);
      await fetchAllUsers();
      setLoading(false);
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/", { replace: true });
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get SIM card counts and roles for each user
      const usersWithCounts = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const [{ count }, { data: rolesData }] = await Promise.all([
            supabase
              .from("sim_cards")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.user_id),
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.user_id)
          ]);

          return {
            ...profile,
            sim_card_count: count || 0,
            roles: rolesData?.map((r: any) => r.role) || [],
          };
        })
      );

      setUsers(usersWithCounts);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    }
  };

  const fetchUserSimCards = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("sim_cards")
        .select(`
          *,
          account:accounts(login)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserSimCards(data || []);
    } catch (error) {
      console.error("Error fetching user SIM cards:", error);
      toast({
        title: "Error",
        description: "Failed to load user SIM cards.",
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!editingProfile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editingProfile.name,
          profile_name: editingProfile.profile_name,
        })
        .eq("user_id", editingProfile.user_id);

      if (error) throw error;

      toast({ title: "Profile updated successfully!" });
      setEditingProfile(null);
      await fetchAllUsers();
      if (selectedUser?.user_id === editingProfile.user_id) {
        setSelectedUser({ ...selectedUser, ...editingProfile });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSimCard = async (simCardId: string) => {
    try {
      const { error } = await supabase
        .from("sim_cards")
        .delete()
        .eq("id", simCardId);

      if (error) throw error;

      toast({ title: "SIM card deleted successfully!" });
      if (selectedUser) {
        await fetchUserSimCards(selectedUser.user_id);
      }
      await fetchAllUsers();
    } catch (error) {
      console.error("Error deleting SIM card:", error);
      toast({
        title: "Error",
        description: "Failed to delete SIM card.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSimStatus = async (simCardId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("sim_cards")
        .update({ status: newStatus })
        .eq("id", simCardId);

      if (error) throw error;

      toast({ title: "SIM card status updated!" });
      if (selectedUser) {
        await fetchUserSimCards(selectedUser.user_id);
      }
    } catch (error) {
      console.error("Error updating SIM status:", error);
      toast({
        title: "Error",
        description: "Failed to update SIM status.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email?.split('@')[0]?.slice(0, 2)?.toUpperCase() || "U";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pt-2">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users and their SIM card data</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="details" disabled={!selectedUser} className="gap-2">
              <User className="h-4 w-4" />
              User Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  Manage user accounts and their information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Profile Name</TableHead>
                      <TableHead>SIM Cards</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || ""} />
                              <AvatarFallback className="text-xs">
                                {getInitials(user.name || user.profile_name, "User")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">User ID: {user.user_id?.slice(0, 8)}...</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingUser?.id === user.id ? (
                            <Input
                              value={editingUser.name || ""}
                              onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                              className="w-full"
                            />
                          ) : (
                            user.name || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {editingUser?.id === user.id ? (
                            <Input
                              value={editingUser.profile_name || ""}
                              onChange={(e) => setEditingUser({ ...editingUser, profile_name: e.target.value })}
                              className="w-full"
                            />
                          ) : (
                            user.profile_name || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.sim_card_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.roles.map((role: string) => (
                              <Badge key={role} variant="outline">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                document.querySelector('[value="details"]')?.dispatchEvent(new MouseEvent('click'));
                              }}
                            >
                              View Details
                            </Button>
                            {editingUser?.id === user.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={handleSaveProfile}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingUser(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {selectedUser && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={selectedUser.avatar_url || ""} />
                          <AvatarFallback>
                            {getInitials(selectedUser.name || selectedUser.profile_name, "User")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle>{selectedUser.name || selectedUser.profile_name || "User"}</CardTitle>
                          <CardDescription>User ID: {selectedUser.user_id}</CardDescription>
                        </div>
                      </div>
                      {editingProfile ? (
                        <div className="flex gap-2">
                          <Button onClick={handleSaveProfile}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button variant="ghost" onClick={() => setEditingProfile(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button onClick={() => setEditingProfile({ ...selectedUser })}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        {editingProfile ? (
                          <Input
                            value={editingProfile.name || ""}
                            onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">{selectedUser.name || "-"}</p>
                        )}
                      </div>
                      <div>
                        <Label>Profile Name</Label>
                        {editingProfile ? (
                          <Input
                            value={editingProfile.profile_name || ""}
                            onChange={(e) => setEditingProfile({ ...editingProfile, profile_name: e.target.value })}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">{selectedUser.profile_name || "-"}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>SIM Cards ({userSimCards.length})</CardTitle>
                    <CardDescription>Manage user's SIM card data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userSimCards.length === 0 ? (
                      <div className="text-center py-8">
                        <IdCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No SIM cards found for this user.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>SIM Number</TableHead>
                            <TableHead>Carrier</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userSimCards.map((simCard) => (
                            <TableRow key={simCard.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  {simCard.phone_number}
                                </div>
                              </TableCell>
                              <TableCell>{simCard.sim_number}</TableCell>
                              <TableCell>{simCard.carrier || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{simCard.sim_type}</Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={simCard.status}
                                  onValueChange={(value) => handleUpdateSimStatus(simCard.id, value)}
                                >
                                  <SelectTrigger className="w-[130px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                    <SelectItem value="swapped">Swapped</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete SIM Card?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the SIM card {simCard.phone_number}. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteSimCard(simCard.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

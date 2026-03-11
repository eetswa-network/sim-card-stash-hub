import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Plus, Pencil, Trash2, Save, X, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Account {
  id: string;
  login: string;
  password: string | null;
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ login: "", password: "" });
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ login: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("accounts")
        .select("id, login, password")
        .eq("user_id", session.user.id)
        .order("login");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast({ title: "Error", description: "Failed to load accounts.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!userId || !newForm.login.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("accounts").insert({
        user_id: userId,
        login: newForm.login.trim(),
        password: newForm.password.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Account created", description: "New carrier account added." });
      setNewForm({ login: "", password: "" });
      setShowNewForm(false);
      await loadAccounts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create account.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (account: Account) => {
    setEditingId(account.id);
    setEditForm({ login: account.login, password: account.password || "" });
  };

  const handleUpdate = async () => {
    if (!editingId || !editForm.login.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ login: editForm.login.trim(), password: editForm.password.trim() || null })
        .eq("id", editingId);
      if (error) throw error;
      toast({ title: "Account updated", description: "Carrier account has been updated." });
      setEditingId(null);
      await loadAccounts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update account.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("accounts").delete().eq("id", deleteId);
      if (error) throw error;
      toast({ title: "Account deleted", description: "Carrier account has been removed." });
      setDeleteId(null);
      await loadAccounts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete account.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading accounts...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Carrier Accounts</h1>
          <p className="text-muted-foreground">
            Manage the login accounts available when adding SIM cards
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Accounts
            </CardTitle>
            {!showNewForm && (
              <Button size="sm" onClick={() => setShowNewForm(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New account form */}
            {showNewForm && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div>
                  <Label htmlFor="new-login">Login / Username</Label>
                  <Input
                    id="new-login"
                    value={newForm.login}
                    onChange={(e) => setNewForm(prev => ({ ...prev, login: e.target.value }))}
                    placeholder="Enter account login"
                  />
                </div>
                <div>
                  <Label htmlFor="new-password">Password (optional)</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newForm.password}
                    onChange={(e) => setNewForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter account password"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => { setShowNewForm(false); setNewForm({ login: "", password: "" }); }}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleCreate} disabled={saving || !newForm.login.trim()}>
                    <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}

            {/* Account list */}
            {accounts.length === 0 && !showNewForm ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No accounts yet. Add one to use in SIM card forms.
              </p>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4">
                  {editingId === account.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label>Login / Username</Label>
                        <Input
                          value={editForm.login}
                          onChange={(e) => setEditForm(prev => ({ ...prev, login: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Password</Label>
                        <Input
                          type="password"
                          value={editForm.password}
                          onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={handleUpdate} disabled={saving || !editForm.login.trim()}>
                          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-medium truncate">{account.login}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {account.password
                            ? (visiblePasswords.has(account.id) ? account.password : "••••••••")
                            : <span className="italic">No password</span>}
                        </p>
                        <div className="flex gap-1">
                          {account.password && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => togglePasswordVisibility(account.id)}
                            >
                              {visiblePasswords.has(account.id) ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => startEdit(account)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(account.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the carrier account. SIM cards using this account will keep their current association but it won't appear in the dropdown anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

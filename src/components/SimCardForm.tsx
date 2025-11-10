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
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const simCardSchema = z.object({
  sim_number: z.string()
    .trim()
    .min(1, "SIM number is required")
    .max(100, "SIM number must be less than 100 characters"),
  phone_number: z.string()
    .trim()
    .min(1, "Phone number is required")
    .max(20, "Phone number must be less than 20 characters")
    .regex(/^[0-9+\-() ]+$/, "Phone number must contain only digits and valid separators"),
  carrier: z.string()
    .trim()
    .max(100, "Carrier name must be less than 100 characters")
    .optional(),
  status: z.enum(["active", "inactive", "expired"], { 
    errorMap: () => ({ message: "Status must be active, inactive, or expired" })
  }),
  sim_type: z.string()
    .trim()
    .max(50, "SIM type must be less than 50 characters"),
  notes: z.string()
    .trim()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
  account_id: z.string().uuid("Invalid account ID").optional().or(z.literal(""))
});

const accountSchema = z.object({
  login: z.string()
    .trim()
    .min(1, "Account login is required")
    .max(255, "Account login must be less than 255 characters"),
  password: z.string()
    .trim()
    .max(255, "Account password must be less than 255 characters")
    .optional()
});

const carrierSchema = z.string()
  .trim()
  .min(1, "Carrier name is required")
  .max(100, "Carrier name must be less than 100 characters");

const usageEntrySchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  use_purpose: z.string()
    .trim()
    .min(1, "Use purpose is required")
    .max(255, "Use purpose must be less than 255 characters")
});

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
    account_id: editingCard?.account_id || "",
  });
  const [isExpiredSim, setIsExpiredSim] = useState(false);
  const [usedForEntries, setUsedForEntries] = useState([{ name: "", use_purpose: "" }]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [existingCarriers, setExistingCarriers] = useState<string[]>([]);
  const [showCustomCarrier, setShowCustomCarrier] = useState(false);
  const [customCarrier, setCustomCarrier] = useState("");
  const [existingAccounts, setExistingAccounts] = useState<Array<{id: string, login: string, password: string}>>([]);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ login: "", password: "" });
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

        // Load existing carriers and accounts for this user
        const [carriersFromSims, carriersFromTable, accountsData] = await Promise.all([
          supabase
            .from("sim_cards")
            .select("carrier")
            .eq("user_id", user.id)
            .not("carrier", "is", null)
            .not("carrier", "eq", ""),
          supabase
            .from("carriers")
            .select("name")
            .eq("user_id", user.id),
          supabase
            .from("accounts")
            .select("*")
            .eq("user_id", user.id)
        ]);
        
        const allCarriers = new Set<string>();
        if (carriersFromSims.data) {
          carriersFromSims.data.forEach(item => allCarriers.add(item.carrier));
        }
        if (carriersFromTable.data) {
          carriersFromTable.data.forEach(item => allCarriers.add(item.name));
        }
        
        setExistingCarriers(Array.from(allCarriers).filter(Boolean));
        setExistingAccounts(accountsData.data || []);
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

      // Validate form data
      const validatedData = simCardSchema.parse({
        ...formData,
        carrier: formData.carrier || undefined,
        notes: formData.notes || undefined,
        account_id: formData.account_id || ""
      });

      // Validate usage entries
      const validatedUsageEntries = usedForEntries
        .filter(entry => entry.name || entry.use_purpose)
        .map(entry => usageEntrySchema.parse(entry));

      // Check for existing SIM number and phone number (only when adding new or if values changed)
      if (!editingCard || formData.sim_number !== editingCard.sim_number || formData.phone_number !== editingCard.phone_number) {
        const checks = [];
        
        // Only check sim_number if it's new or changed, but allow XXXXXXXXXXXXX to be duplicated
        if ((!editingCard || formData.sim_number !== editingCard.sim_number) && formData.sim_number !== 'XXXXXXXXXXXXX') {
          checks.push(
            supabase
              .from("sim_cards")
              .select("id, sim_number")
              .eq("user_id", user.id)
              .eq("sim_number", formData.sim_number)
              .limit(1)
          );
        } else {
          checks.push(Promise.resolve({ data: [] }));
        }
        
        // Only check phone_number if it's new or changed
        if (!editingCard || formData.phone_number !== editingCard.phone_number) {
          checks.push(
            supabase
              .from("sim_cards")
              .select("id, phone_number")
              .eq("user_id", user.id)
              .eq("phone_number", formData.phone_number)
              .limit(1)
          );
        } else {
          checks.push(Promise.resolve({ data: [] }));
        }

        const [simNumberResult, phoneNumberResult] = await Promise.all(checks);
        
        const errors = [];
        if (simNumberResult.data && simNumberResult.data.length > 0) {
          errors.push("A SIM card with this SIM number already exists.");
        }
        if (phoneNumberResult.data && phoneNumberResult.data.length > 0) {
          errors.push("A SIM card with this phone number already exists.");
        }
        
        if (errors.length > 0) {
          toast({
            title: "Duplicate Entry",
            description: errors.join(" "),
            variant: "destructive",
          });
          return;
        }
      }

      let simCardId = editingCard?.id;

      if (editingCard) {
        const { error } = await supabase
          .from("sim_cards")
          .update({
            sim_number: validatedData.sim_number,
            phone_number: validatedData.phone_number,
            carrier: validatedData.carrier || null,
            status: validatedData.status,
            sim_type: validatedData.sim_type,
            notes: validatedData.notes || null,
            account_id: validatedData.account_id || null
          })
          .eq("id", editingCard.id);

        if (error) throw error;

        // Delete existing usage entries
        await supabase
          .from("sim_card_usage")
          .delete()
          .eq("sim_card_id", editingCard.id);
      } else {
        const { data, error} = await supabase
          .from("sim_cards")
          .insert([{ 
            sim_number: validatedData.sim_number,
            phone_number: validatedData.phone_number,
            carrier: validatedData.carrier || null,
            status: validatedData.status,
            sim_type: validatedData.sim_type,
            notes: validatedData.notes || null,
            user_id: user.id, 
            profile_id: profile?.id,
            account_id: validatedData.account_id || null
          }])
          .select()
          .single();

        if (error) throw error;
        simCardId = data.id;
      }

      // Insert new usage entries
      if (validatedUsageEntries.length > 0) {
        const { error: usageError } = await supabase
          .from("sim_card_usage")
          .insert(validatedUsageEntries.map(entry => ({
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
        account_id: "",
      });
      setUsedForEntries([{ name: "", use_purpose: "" }]);
      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
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
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewAccount = async () => {
    if (!user || !newAccount.login.trim()) return;

    try {
      // Validate account data
      const validatedAccount = accountSchema.parse(newAccount);

      // Hash password before saving (one-way hashing for security)
      let hashedPassword = null;
      if (validatedAccount.password) {
        const { data: hashed, error: hashError } = await supabase.rpc(
          'hash_account_password',
          { password_text: validatedAccount.password }
        );
        if (hashError) throw hashError;
        hashedPassword = hashed;
      }

      const { data, error } = await supabase
        .from("accounts")
        .insert([{
          user_id: user.id,
          login: validatedAccount.login,
          password: hashedPassword
        }])
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setExistingAccounts([...existingAccounts, data]);
      
      // Set as selected account
      setFormData({ ...formData, account_id: data.id });
      
      // Reset form
      setNewAccount({ login: "", password: "" });
      setShowNewAccount(false);

      toast({ title: "Account added successfully!" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add account. It might already exist.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>{editingCard ? "Edit SIM Card" : "Add New SIM Card"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
            <div className="space-y-2">
              <Label htmlFor="sim_number">SIM Number *</Label>
              <Input
                id="sim_number"
                value={formData.sim_number}
                onChange={(e) => setFormData({ ...formData, sim_number: e.target.value })}
                placeholder="Enter SIM number"
                required
                className={isMobile ? "min-h-[44px]" : ""}
                disabled={isExpiredSim}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 mt-8">
                <Checkbox
                  id="expired-sim"
                  checked={isExpiredSim}
                  onCheckedChange={(checked) => {
                    setIsExpiredSim(checked as boolean);
                    if (checked) {
                      setFormData({
                        ...formData,
                        sim_number: 'XXXXXXXXXXXXX',
                        status: 'expired'
                      });
                    } else {
                      setFormData({
                        ...formData,
                        sim_number: '',
                        status: 'active'
                      });
                    }
                  }}
                />
                <Label htmlFor="expired-sim">Expired SIM</Label>
              </div>
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
                    onClick={async () => {
                      if (customCarrier.trim()) {
                        const newCarrier = customCarrier.trim();
                        setFormData({ ...formData, carrier: newCarrier });
                        
                        // Add to local state immediately
                        if (!existingCarriers.includes(newCarrier)) {
                          setExistingCarriers([...existingCarriers, newCarrier]);
                        }
                        
                        // Save to carriers table to make it permanently available
                        if (user) {
                          try {
                            await supabase
                              .from("carriers")
                              .insert([{ 
                                name: newCarrier, 
                                user_id: user.id
                              }]);
                          } catch (error) {
                            // Ignore duplicate key errors (carrier already exists)
                            console.log("Carrier might already exist:", error);
                          }
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
                    {existingCarriers.sort().map((carrier) => (
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
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">Account Login</Label>
            <Alert className="mb-3 border-blue-500 bg-blue-50 dark:bg-blue-950">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800 dark:text-blue-200">Security Notice</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                Account passwords are now encrypted in the database using secure encryption functions.
              </AlertDescription>
            </Alert>
            {showNewAccount ? (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Add New Account</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewAccount(false);
                      setNewAccount({ login: "", password: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <div className="space-y-1">
                    <Label htmlFor="new-login">Login/Username</Label>
                    <Input
                      id="new-login"
                      value={newAccount.login}
                      onChange={(e) => setNewAccount({ ...newAccount, login: e.target.value })}
                      placeholder="Enter login/username"
                      className={isMobile ? "min-h-[44px]" : ""}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-password">Password</Label>
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newAccount.password}
                      onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                      placeholder="Enter password"
                      className={isMobile ? "min-h-[44px]" : ""}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-password-new"
                      checked={showPassword}
                      onCheckedChange={(checked) => setShowPassword(checked === true)}
                      className={isMobile ? "w-5 h-5" : ""}
                    />
                    <Label htmlFor="show-password-new" className={`font-normal ${isMobile ? 'text-base' : 'text-sm'}`}>
                      Show password
                    </Label>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddNewAccount}
                    disabled={!newAccount.login.trim()}
                    className={isMobile ? "min-h-[44px]" : ""}
                  >
                    Add Account
                  </Button>
                </div>
              </div>
            ) : (
              <Select 
                value={formData.account_id} 
                onValueChange={(value) => {
                  if (value === "add_new") {
                    setShowNewAccount(true);
                  } else {
                    setFormData({ ...formData, account_id: value });
                  }
                }}
              >
                <SelectTrigger className={isMobile ? "min-h-[44px]" : ""}>
                  <SelectValue placeholder="Select account or add new..." />
                </SelectTrigger>
                <SelectContent>
                  {existingAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.login}
                    </SelectItem>
                  ))}
                  <SelectItem value="add_new">+ Add new account...</SelectItem>
                </SelectContent>
              </Select>
            )}
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
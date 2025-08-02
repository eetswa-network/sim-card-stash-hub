import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, X, Edit2, Trash2 } from "lucide-react";

interface UsageEntry {
  id: string;
  name: string;
  use_purpose: string;
}

interface EditableUsageTableProps {
  simCardId: string;
  usageData: UsageEntry[];
  onUsageUpdate: (simCardId: string, newUsageData: UsageEntry[]) => void;
}

export function EditableUsageTable({ simCardId, usageData, onUsageUpdate }: EditableUsageTableProps) {
  console.log(`EditableUsageTable for ${simCardId}: received ${usageData.length} usage entries:`, usageData);
  
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [newRow, setNewRow] = useState({ name: "", use_purpose: "" });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editValues, setEditValues] = useState<{ [key: string]: { name: string; use_purpose: string } }>({});
  const { toast } = useToast();

  const saveUsageEntry = async (data: { name: string; use_purpose: string }, usageId?: string) => {
    try {
      if (usageId) {
        // Update existing entry
        const { error } = await supabase
          .from("sim_card_usage")
          .update(data)
          .eq("id", usageId);
        
        if (error) throw error;
        
        // Update local state
        const updatedUsage = usageData.map(usage => 
          usage.id === usageId ? { ...usage, ...data } : usage
        );
        onUsageUpdate(simCardId, updatedUsage);
      } else {
        // Insert new entry
        const { data: newUsage, error } = await supabase
          .from("sim_card_usage")
          .insert({ 
            sim_card_id: simCardId, 
            ...data,
            user_id: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Update local state
        const updatedUsage = [...usageData, newUsage];
        onUsageUpdate(simCardId, updatedUsage);
      }
      
      toast({ title: "Usage entry saved successfully!" });
    } catch (error) {
      console.error("Error saving usage entry:", error);
      toast({
        title: "Error",
        description: "Failed to save usage entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteUsageEntry = async (usageId: string) => {
    try {
      const { error } = await supabase
        .from("sim_card_usage")
        .delete()
        .eq("id", usageId);
      
      if (error) throw error;
      
      // Update local state
      const updatedUsage = usageData.filter(usage => usage.id !== usageId);
      onUsageUpdate(simCardId, updatedUsage);
      
      toast({ title: "Usage entry deleted successfully!" });
    } catch (error) {
      console.error("Error deleting usage entry:", error);
      toast({
        title: "Error",
        description: "Failed to delete usage entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (usage: UsageEntry) => {
    setEditingRow(usage.id);
    setEditValues({
      ...editValues,
      [usage.id]: { name: usage.name, use_purpose: usage.use_purpose }
    });
  };

  const handleSaveEdit = async (usageId: string) => {
    const values = editValues[usageId];
    if (values && values.name.trim() && values.use_purpose.trim()) {
      await saveUsageEntry(values, usageId);
      setEditingRow(null);
      setEditValues({ ...editValues, [usageId]: undefined });
    }
  };

  const handleCancelEdit = (usageId: string) => {
    setEditingRow(null);
    setEditValues({ ...editValues, [usageId]: undefined });
  };

  const handleAddNew = async () => {
    if (newRow.name.trim() && newRow.use_purpose.trim()) {
      await saveUsageEntry(newRow);
      setNewRow({ name: "", use_purpose: "" });
      setIsAddingNew(false);
    }
  };

  const handleCancelAdd = () => {
    setNewRow({ name: "", use_purpose: "" });
    setIsAddingNew(false);
  };

  return (
    <div className="text-sm text-muted-foreground break-words">
      <div className="flex items-center justify-between mb-2">
        <strong>Used For:</strong>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingNew(true)}
          className="h-6 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      
      <div className="border border-black rounded-md overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 flex border-b border-black">
          <div className="flex-1 flex">
            <div className="w-1/2 px-2 py-1 text-xs font-medium border-r border-black">Name</div>
            <div className="w-1/2 px-2 py-1 text-xs font-medium border-r border-black">Use</div>
          </div>
          <div className="w-20 px-2 py-1 text-xs font-medium text-center">Actions</div>
        </div>
        
        {/* Existing rows */}
        {usageData.map((usage, index) => (
          <div key={usage.id} className="flex border-b border-black">
            {editingRow === usage.id ? (
              <>
                <div className="flex-1 flex">
                  <div className="w-1/2 px-1 py-1 border-r border-black">
                    <Input
                      value={editValues[usage.id]?.name || ''}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        [usage.id]: { ...editValues[usage.id], name: e.target.value }
                      })}
                      className="h-6 text-xs"
                      placeholder="Name"
                    />
                  </div>
                  <div className="w-1/2 px-1 py-1 border-r border-black">
                    <Input
                      value={editValues[usage.id]?.use_purpose || ''}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        [usage.id]: { ...editValues[usage.id], use_purpose: e.target.value }
                      })}
                      className="h-6 text-xs"
                      placeholder="Use"
                    />
                  </div>
                </div>
                <div className="w-20 px-1 py-1 flex gap-1 justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveEdit(usage.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelEdit(usage.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 flex">
                  <div className="w-1/2 px-2 py-1 text-xs border-r border-black">{usage.name}</div>
                  <div className="w-1/2 px-2 py-1 text-xs border-r border-black">{usage.use_purpose}</div>
                </div>
                <div className="w-20 px-1 py-1 flex gap-1 justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(usage)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteUsageEntry(usage.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
        
        {/* Add new row */}
        {isAddingNew && (
          <div className="flex">
            <div className="flex-1 flex">
              <div className="w-1/2 px-1 py-1 border-r border-black">
                <Input
                  value={newRow.name}
                  onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
                  className="h-6 text-xs"
                  placeholder="Name"
                />
              </div>
              <div className="w-1/2 px-1 py-1 border-r border-black">
                <Input
                  value={newRow.use_purpose}
                  onChange={(e) => setNewRow({ ...newRow, use_purpose: e.target.value })}
                  className="h-6 text-xs"
                  placeholder="Use"
                />
              </div>
            </div>
            <div className="w-20 px-1 py-1 flex gap-1 justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddNew}
                className="h-6 w-6 p-0"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAdd}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {usageData.length === 0 && !isAddingNew && (
          <div className="px-2 py-3 text-center text-xs text-muted-foreground">
            No usage entries. Click "Add" to create one.
          </div>
        )}
      </div>
    </div>
  );
}

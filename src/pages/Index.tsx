import { useState } from "react";
import { SimCardForm } from "@/components/SimCardForm";
import { SimCardList } from "@/components/SimCardList";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus } from "lucide-react";

const Index = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCard(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (card: any) => {
    setEditingCard(card);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCard(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">SIM Card Manager</h1>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add SIM Card
            </Button>
          )}
        </div>

        <div className="space-y-8">
          {showForm && (
            <SimCardForm
              onSuccess={handleFormSuccess}
              editingCard={editingCard}
              onCancel={handleCancel}
            />
          )}

          <div>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Your SIM Cards</h2>
            <SimCardList onEdit={handleEdit} refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

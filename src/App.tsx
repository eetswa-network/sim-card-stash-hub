import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OfflineBanner } from "@/components/OfflineBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Security from "./pages/Security";
import Updates from "./pages/Updates";
import Install from "./pages/Install";
import AccountDetails from "./pages/AccountDetails";
import Statistics from "./pages/Statistics";
import Devices from "./pages/Devices";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (location.pathname !== "/") {
      navigate("/");
    }
  }, [location.pathname, navigate]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <OfflineBanner />
      <Header onSearch={handleSearch} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Index searchQuery={searchQuery} />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/security" element={<Security />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/updates" element={<Updates />} />
          <Route path="/install" element={<Install />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/account" element={<AccountDetails />} />
          <Route path="/admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

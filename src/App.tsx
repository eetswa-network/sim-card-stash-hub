import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Security from "./pages/Security";
import Updates from "./pages/Updates";
import AccountDetails from "./pages/AccountDetails";
import LogoOptions from "./pages/LogoOptions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  
  const showSearch = location.pathname === "/";
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearch={showSearch ? setSearchQuery : undefined} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Index searchQuery={searchQuery} />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/security" element={<Security />} />
          <Route path="/updates" element={<Updates />} />
          <Route path="/account" element={<AccountDetails />} />
          <Route path="/logos" element={<LogoOptions />} />
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

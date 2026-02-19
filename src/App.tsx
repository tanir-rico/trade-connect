import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import HomePage from "@/pages/HomePage";
import CatalogPage from "@/pages/CatalogPage";
import ListingDetail from "@/pages/ListingDetail";
import ListingForm from "@/pages/ListingForm";
import ChatList from "@/pages/ChatList";
import ChatRoom from "@/pages/ChatRoom";
import ProfilePage from "@/pages/ProfilePage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Загрузка...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Загрузка...</div>;
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/" element={<ProtectedRoute><AppLayout><HomePage /></AppLayout></ProtectedRoute>} />
      <Route path="/catalog" element={<ProtectedRoute><AppLayout><CatalogPage /></AppLayout></ProtectedRoute>} />
      <Route path="/listings/new" element={<ProtectedRoute><AppLayout><ListingForm /></AppLayout></ProtectedRoute>} />
      <Route path="/listings/edit/:id" element={<ProtectedRoute><AppLayout><ListingForm /></AppLayout></ProtectedRoute>} />
      <Route path="/listings/:id" element={<ProtectedRoute><AppLayout><ListingDetail /></AppLayout></ProtectedRoute>} />
      <Route path="/chats" element={<ProtectedRoute><AppLayout><ChatList /></AppLayout></ProtectedRoute>} />
      <Route path="/chats/:id" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
      <Route path="/profile/:userId" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

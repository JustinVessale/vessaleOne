import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RestaurantPage } from './features/restaurant/components/RestaurantPage';
import { CartProvider } from './features/cart/context/CartContext';
import { CheckoutPageWrapper } from './features/payment/components/CheckoutPageWrapper';
import { Cart } from './features/cart/components/Cart';
import { LoginPage } from '@/features/restaurant-portal/components/LoginPage';
import { ProtectedRoute } from '@/features/restaurant-portal/components/ProtectedRoute';
import { PortalLayout } from '@/features/restaurant-portal/components/PortalLayout';
import { portalRoutes } from '@/features/restaurant-portal/routes';
import { Toaster } from "@/components/ui/toaster";
import OrderSuccessPage from './app/order/successPage';
import OrderCancelPage from './app/order/cancelPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

// Wrapper component to handle cart visibility logic
function AppContent() {
  const location = useLocation();
  const hideCartPaths = ['/checkout', '/orders', '/portal'];
  
  // Check if we're on a restaurant page (either /:restaurantSlug or /:restaurantSlug/:locationSlug)
  // This regex matches "/something" or "/something/something-else"
  const isRestaurantPage = /^\/[^/]+\/?([^/]+)?$/.test(location.pathname);
  const shouldShowCart = !hideCartPaths.some(path => location.pathname.startsWith(path)) && !isRestaurantPage;

  return (
    <div className="flex flex-col min-h-screen">
      <Routes>
        {/* Restaurant routes - now as top-level routes */}
        <Route path="/:restaurantSlug" element={<RestaurantPage />} />
        <Route path="/:restaurantSlug/:locationSlug" element={<RestaurantPage />} />
        
        {/* Restaurant-specific order success and cancel routes */}
        <Route path="/:restaurantSlug/order/success" element={<OrderSuccessPage />} />
        <Route path="/:restaurantSlug/order/cancel" element={<OrderCancelPage />} />
        <Route path="/:restaurantSlug/:locationSlug/order/success" element={<OrderSuccessPage />} />
        <Route path="/:restaurantSlug/:locationSlug/order/cancel" element={<OrderCancelPage />} />
        
        {/* Redirect root to handle empty path (optional, can be customized) */}
        <Route path="/" element={<Navigate to="/not-found" replace />} />
        
        {/* Checkout and order confirmation routes */}
        <Route path="/checkout" element={<CheckoutPageWrapper />} />
        
        {/* Restaurant Portal Routes */}
        <Route path="/portal">
          {/* Index route - redirect to dashboard */}
          <Route index element={
            <ProtectedRoute>
              <Navigate to="/portal/dashboard" replace />
            </ProtectedRoute>
          } />
          <Route path="login" element={<LoginPage />} />
          
          {/* Individual portal routes with explicit paths instead of wildcard */}
          {portalRoutes.map((route) => (
            <Route 
              key={route.path} 
              path={route.path} 
              element={
                <ProtectedRoute>
                  <PortalLayout>
                    <route.component />
                  </PortalLayout>
                </ProtectedRoute>
              } 
            />
          ))}
        </Route>
      </Routes>
      {shouldShowCart && <Cart />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <AppContent />
          <Toaster />
        </CartProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
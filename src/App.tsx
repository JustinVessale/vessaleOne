import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationBar } from './features/shared/components/NavigationBar';
import { RestaurantPage } from './features/restaurant/components/RestaurantPage';
import { CartProvider } from './features/cart/context/CartContext';
import { CheckoutPage } from './features/payment/components/CheckoutPage';
import { OrderConfirmationPage } from '@/features/orders/components/OrderConfirmationPage';
import { Cart } from './features/cart/components/Cart';
import { LoginPage } from '@/features/restaurant-portal/components/LoginPage';
import { ProtectedRoute } from '@/features/restaurant-portal/components/ProtectedRoute';

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
  
  // Don't show the cart in App.tsx for restaurant pages (it's included in RestaurantPage)
  // or for checkout, order, and portal pages
  const isRestaurantPage = /^\/[^/]+$/.test(location.pathname);
  const shouldShowCart = !hideCartPaths.some(path => location.pathname.startsWith(path)) && !isRestaurantPage;

  return (
    <div className="flex flex-col min-h-screen">
      <NavigationBar />
      <Routes>
        <Route path="/:slug" element={<RestaurantPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders/:orderId" element={<OrderConfirmationPage />} />
        
        {/* Restaurant Portal Routes */}
        <Route path="/portal">
          <Route path="login" element={<LoginPage />} />
          <Route path="dashboard" element={
            <ProtectedRoute>
              <div>Dashboard (Coming Soon)</div>
            </ProtectedRoute>
          } />
          <Route path="orders" element={
            <ProtectedRoute>
              <div>Orders (Coming Soon)</div>
            </ProtectedRoute>
          } />
          <Route path="menu" element={
            <ProtectedRoute>
              <div>Menu (Coming Soon)</div>
            </ProtectedRoute>
          } />
          <Route path="analytics" element={
            <ProtectedRoute>
              <div>Analytics (Coming Soon)</div>
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute>
              <div>Settings (Coming Soon)</div>
            </ProtectedRoute>
          } />
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
        </CartProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
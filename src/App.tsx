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
import { PortalLayout } from '@/features/restaurant-portal/components/PortalLayout';
import { DashboardPage } from '@/features/restaurant-portal/components/DashboardPage';
import { OrdersPage } from '@/features/restaurant-portal/components/OrdersPage';
import { MenuPage } from '@/features/restaurant-portal/components/MenuPage';
import { AnalyticsPage } from '@/features/restaurant-portal/components/AnalyticsPage';
import { AccountPage } from '@/features/restaurant-portal/components/AccountPage';

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
              <PortalLayout>
                <DashboardPage />
              </PortalLayout>
            </ProtectedRoute>
          } />
          <Route path="orders" element={
            <ProtectedRoute>
              <PortalLayout>
                <OrdersPage />
              </PortalLayout>
            </ProtectedRoute>
          } />
          <Route path="menu" element={
            <ProtectedRoute>
              <PortalLayout>
                <MenuPage />
              </PortalLayout>
            </ProtectedRoute>
          } />
          <Route path="analytics" element={
            <ProtectedRoute>
              <PortalLayout>
                <AnalyticsPage />
              </PortalLayout>
            </ProtectedRoute>
          } />
          <Route path="account" element={
            <ProtectedRoute>
              <PortalLayout>
                <AccountPage />
              </PortalLayout>
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
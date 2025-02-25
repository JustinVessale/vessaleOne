import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationBar } from './features/shared/components/NavigationBar';
import { RestaurantPage } from './features/restaurant/components/RestaurantPage';
import { CartProvider } from './features/cart/context/CartContext';
import { CheckoutPage } from './features/payment/components/CheckoutPage';
import { OrderConfirmationPage } from '@/features/orders/components/OrderConfirmationPage';
import { Cart } from './features/cart/components/Cart';
import { testNashProxy } from './lib/services/nashService';

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
  const hideCartPaths = ['/checkout', '/orders'];
  
  // Don't show the cart in App.tsx for restaurant pages (it's included in RestaurantPage)
  // or for checkout and order pages
  const isRestaurantPage = /^\/[^/]+$/.test(location.pathname);
  const shouldShowCart = !hideCartPaths.some(path => location.pathname.startsWith(path)) && !isRestaurantPage;

  return (
    <div className="flex flex-col min-h-screen">
      <NavigationBar />
      {/* Test button for Nash API proxy - only in development */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => testNashProxy()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Test Nash API
          </button>
        </div>
      )}
      <Routes>
        <Route path="/:slug" element={<RestaurantPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders/:orderId" element={<OrderConfirmationPage />} />
      </Routes>
      {shouldShowCart && <Cart />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
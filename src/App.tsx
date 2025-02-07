import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './features/shared/components/Layout';
import { RestaurantPage } from './features/restaurant/components/RestaurantPage';
import { CartProvider } from './features/cart/context/CartContext';
import { Cart } from './features/cart/components/Cart';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/:slug" element={<RestaurantPage />} />
            </Routes>
            <Cart />
          </Layout>
        </BrowserRouter>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;

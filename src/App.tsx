import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationBar } from './features/shared/components/NavigationBar';
import { RestaurantPage } from './features/restaurant/components/RestaurantPage';
import { CartProvider } from './features/cart/context/CartContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen">
            <NavigationBar />
            <Routes>
              <Route path="/:slug" element={<RestaurantPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
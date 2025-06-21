import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';

// Define types
interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  isActive: boolean;
  isChain?: boolean;
}

interface RestaurantContextType {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: Error | null;
  refreshRestaurant: () => Promise<void>;
}

// Create context with default values
const RestaurantContext = createContext<RestaurantContextType>({
  restaurant: null,
  isLoading: false,
  error: null,
  refreshRestaurant: async () => {}
});

// Create a provider component
export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const client = generateClient<Schema>();

  // Function to fetch restaurant data
  const fetchRestaurant = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, you would get the restaurant ID from user session/auth
      // For now, we'll fetch the first restaurant (from sample data or similar)
      const restaurantId = sessionStorage.getItem('restaurantId');
      
      if (!restaurantId) {
        throw new Error('No restaurant ID found in session storage');
      }
      
      const { data: restaurantData, errors: restaurantErrors } = await client.models.Restaurant.get({
        id: restaurantId
      }, {
        authMode: 'apiKey'
      });
      
      if (restaurantErrors) {
        throw new Error('Failed to fetch restaurant data');
      }
      
      if (!restaurantData) {
        throw new Error('Restaurant not found');
      }
      
      // Set restaurant data
      setRestaurant(restaurantData as unknown as Restaurant);
    } catch (err) {
      console.error('Error fetching restaurant:', err);
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch restaurant data on component mount
  useEffect(() => {
    fetchRestaurant();
  }, []);

  return (
    <RestaurantContext.Provider value={{ 
      restaurant, 
      isLoading, 
      error, 
      refreshRestaurant: fetchRestaurant 
    }}>
      {children}
    </RestaurantContext.Provider>
  );
}

// Custom hook to use the context
export function useRestaurantContext() {
  return useContext(RestaurantContext);
} 
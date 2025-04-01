import { useEffect, useState } from 'react';
import { PortalLayout } from '@/features/restaurant-portal/components/PortalLayout';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../amplify/data/resource';
import { Loader2 } from 'lucide-react';

const client = generateClient<Schema>();

export default function RestaurantPortalPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuthAndFetchRestaurant() {
      try {
        // Check if user is authenticated
        const user = await getCurrentUser();
        setIsAuthenticated(true);
        
        // Get the user's email to find their restaurant
        const userEmail = user.username;
        
        // Find the restaurant that the user is associated with
        const { data: staffData } = await client.models.RestaurantStaff.list({
          filter: {
            email: { eq: userEmail }
          },
          selectionSet: ['id', 'restaurantId', 'role']
        });
        
        if (!staffData || staffData.length === 0) {
          setError("You are not associated with any restaurant.");
          setIsLoading(false);
          return;
        }
        
        // Store the restaurant ID and role in session storage
        const staffMember = staffData[0];
        sessionStorage.setItem('restaurantId', staffMember.restaurantId);
        sessionStorage.setItem('staffRole', staffMember.role);
        
        // Fetch the restaurant name
        const { data: restaurant } = await client.models.Restaurant.get({
          id: staffMember.restaurantId
        });
        
        if (restaurant) {
          sessionStorage.setItem('restaurantName', restaurant.name);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error during authentication check:', error);
        setError("Authentication failed. Please log in again.");
        setIsLoading(false);
      }
    }
    
    checkAuthAndFetchRestaurant();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Loading restaurant portal...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => window.location.href = '/login'}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  return <PortalLayout />;
} 
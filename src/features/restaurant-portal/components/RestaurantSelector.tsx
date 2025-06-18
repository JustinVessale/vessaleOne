import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Building, MapPin, Users, Check } from 'lucide-react';

const client = generateClient<Schema>();

interface RestaurantOption {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  role: string;
  isChain: boolean;
  isActive: boolean;
}

interface RestaurantSelectorProps {
  userEmail: string;
  onRestaurantSelected: (restaurantId: string, restaurantName: string, role: string) => void;
}

export function RestaurantSelector({ userEmail, onRestaurantSelected }: RestaurantSelectorProps) {
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserRestaurants();
  }, [userEmail]);

  const fetchUserRestaurants = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all staff records for this user
      const { data: staffMembers, errors } = await client.models.RestaurantStaff.list({
        filter: {
          email: { eq: userEmail },
          isActive: { eq: true }
        }
      });

      if (errors) {
        console.error('Errors fetching staff members:', errors);
        setError('Failed to fetch your restaurant access');
        return;
      }

      if (!staffMembers || staffMembers.length === 0) {
        setError('You are not associated with any restaurants');
        return;
      }

      // Fetch restaurant details for each staff record
      const restaurantPromises = staffMembers.map(async (staff) => {
        if (!staff.restaurantId) return null;

        const { data: restaurant, errors: restaurantErrors } = await client.models.Restaurant.get({
          id: staff.restaurantId
        });

        if (restaurantErrors || !restaurant) {
          console.error('Error fetching restaurant:', restaurantErrors);
          return null;
        }

        return {
          id: restaurant.id,
          name: restaurant.name || 'Unnamed Restaurant',
          description: restaurant.description,
          address: restaurant.address,
          city: restaurant.city,
          state: restaurant.state,
          role: staff.role || 'STAFF',
          isChain: restaurant.isChain || false,
          isActive: restaurant.isActive || false
        };
      });

      const restaurantResults = await Promise.all(restaurantPromises);
      const validRestaurants = restaurantResults.filter(Boolean) as RestaurantOption[];

      // Only show active restaurants
      const activeRestaurants = validRestaurants.filter(r => r.isActive);

      if (activeRestaurants.length === 0) {
        setError('You do not have access to any active restaurants');
        return;
      }

      setRestaurants(activeRestaurants);

      // If user only has access to one restaurant, auto-select it
      if (activeRestaurants.length === 1) {
        const restaurant = activeRestaurants[0];
        setSelectedRestaurant(restaurant.id);
        // Auto-select after a brief delay to show the selector briefly
        setTimeout(() => {
          handleRestaurantSelect(restaurant.id, restaurant.name, restaurant.role);
        }, 500);
      }

    } catch (error) {
      console.error('Error fetching user restaurants:', error);
      setError('Failed to load your restaurant access');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestaurantSelect = async (restaurantId: string, restaurantName: string, role: string) => {
    setIsSelecting(true);
    
    try {
      // Store the selection in session storage
      sessionStorage.setItem('restaurantId', restaurantId);
      sessionStorage.setItem('restaurantName', restaurantName);
      sessionStorage.setItem('staffRole', role);
      
      // Call the callback to notify parent component
      onRestaurantSelected(restaurantId, restaurantName, role);
      
      // Navigate to dashboard
      navigate('/portal/dashboard', { replace: true });
    } catch (error) {
      console.error('Error selecting restaurant:', error);
      setError('Failed to select restaurant');
    } finally {
      setIsSelecting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      'OWNER': 'bg-purple-100 text-purple-800',
      'MANAGER': 'bg-blue-100 text-blue-800',
      'STAFF': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[role as keyof typeof roleColors] || roleColors.STAFF}`}>
        {role}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Loading your restaurants...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-lg text-center">
          <p className="font-bold">Access Error</p>
          <p className="mt-2">{error}</p>
        </div>
        <Button 
          onClick={() => navigate('/portal/login')}
          className="mt-4"
        >
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Select Restaurant
          </h1>
          <p className="text-gray-600">
            You have access to {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''}. 
            Choose which one you'd like to manage.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {restaurants.map((restaurant) => (
            <div 
              key={restaurant.id}
              className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedRestaurant === restaurant.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedRestaurant(restaurant.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building className="h-5 w-5 text-gray-500" />
                    {restaurant.name}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {restaurant.description || 'No description available'}
                  </p>
                </div>
                {selectedRestaurant === restaurant.id && (
                  <Check className="h-5 w-5 text-blue-600" />
                )}
              </div>
              
              <div className="space-y-2">
                {restaurant.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {restaurant.address}
                      {restaurant.city && restaurant.state && `, ${restaurant.city}, ${restaurant.state}`}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    {getRoleBadge(restaurant.role)}
                  </div>
                  
                  {restaurant.isChain && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Chain
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedRestaurant && (
          <div className="mt-6 text-center">
            <Button 
              onClick={() => {
                const restaurant = restaurants.find(r => r.id === selectedRestaurant);
                if (restaurant) {
                  handleRestaurantSelect(restaurant.id, restaurant.name, restaurant.role);
                }
              }}
              disabled={isSelecting}
              className="px-8 py-3"
            >
              {isSelecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                'Continue to Dashboard'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 
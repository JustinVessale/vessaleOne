import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();


// Interface for the location that's displayed in the UI, with non-nullable fields
interface DisplayLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  isActive: boolean;
}

interface RestaurantLocationContextType {
  locations: DisplayLocation[];
  selectedLocation: DisplayLocation | null;
  isLoading: boolean;
  error: string | null;
  setSelectedLocationById: (locationId: string) => void;
  refreshLocations: () => Promise<void>;
}

const RestaurantLocationContext = createContext<RestaurantLocationContextType | undefined>(undefined);

interface RestaurantLocationProviderProps {
  children: ReactNode;
}

export function RestaurantLocationProvider({ children }: RestaurantLocationProviderProps) {
  const [locations, setLocations] = useState<DisplayLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<DisplayLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const restaurantId = sessionStorage.getItem('restaurantId');
      
      if (!restaurantId) {
        setError('No restaurant ID found. Please login again.');
        setIsLoading(false);
        return;
      }

      // Fetch locations for the restaurant
      const { data, errors } = await client.models.RestaurantLocation.list({
        filter: {
          restaurantId: { eq: restaurantId },
          isActive: { eq: true }
        },
        selectionSet: ['id', 'name', 'address', 'city', 'state', 'zip', 'isActive']
      });

      if (errors) {
        console.error('Errors fetching restaurant locations:', errors);
        setError('Failed to fetch restaurant locations');
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Convert nullable fields to non-nullable with defaults
        const processedLocations: DisplayLocation[] = data.map(loc => ({
          id: loc.id,
          name: loc.name || 'Unnamed Location',
          address: loc.address || 'No address',
          city: loc.city || 'No city',
          state: loc.state || 'No state',
          zip: loc.zip || 'No zip',
          isActive: loc.isActive === true // Default to false if null
        }));
        
        setLocations(processedLocations);
        
        // Check if there's a saved location in session storage
        const savedLocationId = sessionStorage.getItem('selectedLocationId');
        
        // Set the selected location
        if (savedLocationId) {
          const savedLocation = processedLocations.find(loc => loc.id === savedLocationId);
          if (savedLocation) {
            setSelectedLocation(savedLocation);
          } else {
            // If saved location not found, use the first one
            setSelectedLocation(processedLocations[0]);
            sessionStorage.setItem('selectedLocationId', processedLocations[0].id);
          }
        } else {
          // No saved location, select the first one
          setSelectedLocation(processedLocations[0]);
          sessionStorage.setItem('selectedLocationId', processedLocations[0].id);
        }
      } else {
        setError('No locations found for this restaurant');
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to fetch restaurant locations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const setSelectedLocationById = (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    if (location) {
      setSelectedLocation(location);
      sessionStorage.setItem('selectedLocationId', locationId);
    }
  };

  const refreshLocations = async () => {
    await fetchLocations();
  };

  const value = {
    locations,
    selectedLocation,
    isLoading,
    error,
    setSelectedLocationById,
    refreshLocations
  };

  return (
    <RestaurantLocationContext.Provider value={value}>
      {children}
    </RestaurantLocationContext.Provider>
  );
}

export const useRestaurantLocation = (): RestaurantLocationContextType => {
  const context = useContext(RestaurantLocationContext);
  if (context === undefined) {
    throw new Error('useRestaurantLocation must be used within a RestaurantLocationProvider');
  }
  return context;
}; 
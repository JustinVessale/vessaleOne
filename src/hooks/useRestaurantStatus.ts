import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

interface UseRestaurantStatusProps {
  restaurantId: string;
  locationId?: string;
}

export function useRestaurantStatus({ restaurantId, locationId }: UseRestaurantStatusProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRestaurantStatus();
  }, [restaurantId, locationId]);

  const fetchRestaurantStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (locationId) {
        // Check location status
        const { data: location, errors } = await client.models.RestaurantLocation.get({
          id: locationId
        });
        
        if (errors) {
          throw new Error('Failed to fetch location status');
        }
        
        // Default to false if isOpen is undefined
        setIsOpen(location?.isOpen ?? false);
      } else {
        // Check restaurant status
        const { data: restaurant, errors } = await client.models.Restaurant.get({
          id: restaurantId
        });
        
        if (errors) {
          throw new Error('Failed to fetch restaurant status');
        }
        
        // Default to false if isOpen is undefined
        setIsOpen(restaurant?.isOpen ?? false);
      }
    } catch (err) {
      console.error('Error fetching restaurant status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch restaurant status');
      // Default to false if there's an error
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isOpen,
    isLoading,
    error,
    refetch: fetchRestaurantStatus
  };
} 
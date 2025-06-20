import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { useToast } from '@/hooks/use-toast';
import { useSelectedLocation } from '../hooks/useSelectedLocation';
import { Store, X } from 'lucide-react';

const client = generateClient<Schema>();

interface RestaurantStatusToggleProps {
  className?: string;
}

export function RestaurantStatusToggle({ className = '' }: RestaurantStatusToggleProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const { toast } = useToast();
  const { locationId, locationName, hasLocation } = useSelectedLocation();

  useEffect(() => {
    fetchRestaurantStatus();
  }, [locationId]);

  const fetchRestaurantStatus = async () => {
    try {
      setIsLoading(true);
      const restaurantId = sessionStorage.getItem('restaurantId');
      
      if (!restaurantId) {
        console.error('No restaurant ID found');
        return;
      }

      if (hasLocation && locationId) {
        // Fetch location status
        const { data: location, errors } = await client.models.RestaurantLocation.get({
          id: locationId
        });
        
        if (errors) {
          console.error('Error fetching location status:', errors);
          return;
        }
        
        setIsOpen(location?.isOpen ?? false);
      } else {
        // Fetch restaurant status
        const { data: restaurant, errors } = await client.models.Restaurant.get({
          id: restaurantId
        });
        
        if (errors) {
          console.error('Error fetching restaurant status:', errors);
          return;
        }
        
        setIsOpen(restaurant?.isOpen ?? false);
      }
    } catch (error) {
      console.error('Error fetching restaurant status:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch restaurant status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      setIsUpdating(true);
      const restaurantId = sessionStorage.getItem('restaurantId');
      
      if (!restaurantId) {
        toast({
          title: 'Error',
          description: 'No restaurant ID found',
          variant: 'destructive',
        });
        return;
      }

      const newStatus = !isOpen;

      if (hasLocation && locationId) {
        // Update location status
        const { errors } = await client.models.RestaurantLocation.update({
          id: locationId,
          isOpen: newStatus,
        });
        
        if (errors) {
          throw new Error('Failed to update location status');
        }
      } else {
        // Update restaurant status
        const { errors } = await client.models.Restaurant.update({
          id: restaurantId,
          isOpen: newStatus,
        });
        
        if (errors) {
          throw new Error('Failed to update restaurant status');
        }
      }

      setIsOpen(newStatus);
      
      const entityName = hasLocation ? locationName : 'Restaurant';
      toast({
        title: 'Status Updated',
        description: `${entityName} is now ${newStatus ? 'open' : 'closed'}`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating restaurant status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update restaurant status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    );
  }

  const entityName = hasLocation ? locationName : 'Restaurant';

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isOpen ? (
            <Store className="h-5 w-5 text-green-600" />
          ) : (
            <X className="h-5 w-5 text-red-600" />
          )}
          <div>
            <h3 className="font-medium text-gray-900">Restaurant Status</h3>
            <p className="text-sm text-gray-500">
              {entityName} is currently {isOpen ? 'open' : 'closed'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleToggle}
          disabled={isUpdating}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isOpen ? 'bg-green-600' : 'bg-gray-200'
          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isOpen ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      
      {isUpdating && (
        <div className="mt-2 text-sm text-gray-500">
          Updating status...
        </div>
      )}
    </div>
  );
} 
import { useRestaurantLocation } from '../context/RestaurantLocationContext';

export function useSelectedLocation() {
  const { selectedLocation } = useRestaurantLocation();
  
  return {
    locationId: selectedLocation?.id,
    locationName: selectedLocation?.name,
    hasLocation: !!selectedLocation,
    selectedLocation
  };
} 
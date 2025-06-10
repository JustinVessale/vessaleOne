import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { MenuCategory } from '../../menu/components/MenuCategory';
import { Cart } from '../../cart/components/Cart';
import { StorageImage } from '@/components/ui/s3-image';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../cart/context/CartContext';

const client = generateClient<Schema>();

// Define a simple type for our restaurant to use in the component
interface RestaurantData {
  id?: string;
  name?: string;
  description?: string;
  bannerImageUrl?: string;
  locations?: any[];
  menuCategories?: any[];
  location?: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phoneNumber?: string;
    menuCategories?: any[];
  };
}

export function RestaurantPage() {
  const { restaurantSlug, locationSlug } = useParams<{ 
    restaurantSlug: string;
    locationSlug?: string;
  }>();
  
  const { data: restaurant, isLoading } = useQuery<RestaurantData>({
    queryKey: ['restaurant', restaurantSlug, locationSlug],
    queryFn: async () => {
      try {
        // First, fetch the restaurant
        const { data: restaurantData, errors: restaurantErrors } = await client.models.Restaurant.list({
          filter: { slug: { eq: restaurantSlug } },
          selectionSet: ['id', 'name', 'description', 'bannerImageUrl', 'menuCategories.*', 'locations.*', 'isChain']
        });
        
        if (restaurantErrors) throw new Error('Failed to fetch restaurant');
        if (!restaurantData || restaurantData.length === 0) throw new Error('Restaurant not found');
        
        // We need to assert this as any to access properties safely
        const restaurantObj = restaurantData[0] as any;
        
        // If we're looking for a specific location
        if (locationSlug && restaurantObj.id) {
          console.log(`Fetching location with slug: ${locationSlug} for restaurant ID: ${restaurantObj.id}`);
          const { data: locationData, errors: locationErrors } = await client.models.RestaurantLocation.list({
            filter: { 
              slug: { eq: locationSlug },
              restaurantId: { eq: restaurantObj.id }
            },
            selectionSet: ['id', 'name', 'slug', 'description', 'bannerImageUrl', 'address', 'city', 'state', 'zip', 'phoneNumber', 'menuCategories.*']
          });
          
          console.log('Location API response:', { locationData, errors: locationErrors });
          
          if (locationErrors) throw new Error('Failed to fetch location data');
          if (!locationData || locationData.length === 0) throw new Error('Location not found');
          
          // We need to assert this as any to access properties safely
          const locationObj = locationData[0] as any;
          
          // Combine restaurant with location data
          return {
            ...restaurantObj,
            name: locationObj.name || restaurantObj.name,
            description: locationObj.description || restaurantObj.description,
            bannerImageUrl: locationObj.bannerImageUrl || restaurantObj.bannerImageUrl,
            location: locationObj,
            // Combine menu categories from both restaurant and location
            menuCategories: [
              ...(restaurantObj.menuCategories || []),
              ...(locationObj.menuCategories || []).filter((locCat: any) => 
                // Only add location categories that don't have the same name as restaurant categories
                !(restaurantObj.menuCategories || []).some((resCat: any) => resCat.name === locCat.name)
              )
            ]
          } as RestaurantData;
        }
        
        // Just return the restaurant with normalized properties
        return {
          ...restaurantObj,
          locations: restaurantObj.locations || [],
          menuCategories: restaurantObj.menuCategories || []
        } as RestaurantData;
      } catch (error) {
        console.error('Error fetching restaurant:', error);
        throw error;
      }
    }
  });

  const { toggleCart, state } = useCart();
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading) {
    return <div className="animate-pulse h-screen bg-gray-100" />;
  }

  if (!restaurant) {
    return <div className="h-screen flex items-center justify-center">Restaurant not found</div>;
  }

  // Display location information if we're on a location page
  const showLocationInfo = !!locationSlug && !!restaurant.location;
  
  // Safely access locations and menu categories
  const locations = restaurant.locations || [];
  const hasLocations = Array.isArray(locations) && locations.length > 0;
  
  const menuCategories = restaurant.menuCategories || [];
  const hasMenuCategories = Array.isArray(menuCategories) && menuCategories.length > 0;

  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section - Fixed height */}
      <div className="relative h-48 md:h-64">
        <StorageImage
          src={(restaurant).bannerImageUrl ?? ''}
          alt={restaurant.name ?? ''}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50">
          <div className="h-full max-w-7xl mx-auto px-4 flex items-end pb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{restaurant.name}</h1>
              <p className="mt-2 text-sm md:text-base text-white/90">{restaurant.description}</p>
              
              {/* If we're on a location page, show the location-specific details */}
              {showLocationInfo && restaurant.location && (
                <div className="mt-2 text-white/90 text-sm">
                  <p>{restaurant.location.address}</p>
                  <p>{restaurant.location.city}, {restaurant.location.state} {restaurant.location.zip}</p>
                  <p>{restaurant.location.phoneNumber}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* If this is a chain restaurant without location, show locations picker */}
      {!locationSlug && hasLocations && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h2 className="font-semibold mb-2">Select a Location</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {locations.map((location: any) => (
                <a 
                  key={location.id} 
                  href={`/${restaurantSlug}/${location.slug}`}
                  className="block p-3 border rounded hover:bg-gray-50"
                >
                  <div className="font-medium">{location.name}</div>
                  <div className="text-sm text-gray-600">{location.address}</div>
                  <div className="text-sm text-gray-600">{location.city}, {location.state}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Menu Content - Takes available space */}
            <div className="flex-1">
              <div className="space-y-6 pb-20 lg:pb-0">
                {hasMenuCategories && menuCategories.map((category: any) => (
                  <MenuCategory 
                    key={category.id} 
                    categoryId={category.id} 
                    restaurantId={restaurant.id || ''}
                    locationId={locationSlug ? restaurant.location?.id : undefined}
                  />
                ))}
                
                {/* If there are no menu categories */}
                {!hasMenuCategories && (
                  <div className="p-4 bg-white rounded shadow">
                    <p className="text-center text-gray-500">No menu items available</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Desktop Cart - Fixed width, only visible on large screens */}
            <div className="hidden lg:block w-80 flex-shrink-0 sticky top-24 self-start">
              <Cart />
            </div>
          </div>
        </div>
      </div>

      {/* Uber Eats Style Floating Cart Button */}
      {itemCount > 0 && (
        <div className="lg:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleCart();
            }}
            className="bg-black text-white px-6 py-3 rounded-full shadow-lg hover:bg-gray-800 transition-all duration-200 flex items-center space-x-3 min-w-[160px] justify-center"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            <span className="font-medium">View cart • {itemCount}</span>
          </button>
        </div>
      )}
    </div>
  );
}
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { MenuCategory } from '../../menu/components/MenuCategory';
import { Cart } from '../../cart/components/Cart';
import { StorageImage } from '@/components/ui/s3-image';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../cart/context/CartContext';
import { useEffect, useState } from 'react';
import { CategoryScroll } from '@/components/ui/category-scroll';
import { RestaurantStatus } from '@/components/RestaurantStatus';
import { isRestaurantOpenFromHours, BusinessHours } from '@/utils/business-hours';

const client = generateClient<Schema>();

// Define a simple type for our restaurant to use in the component
interface RestaurantData {
  id?: string;
  name?: string;
  description?: string;
  bannerImageUrl?: string;
  timezone?: string;
  businessHours?: BusinessHours[];
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
    timezone?: string;
    businessHours?: BusinessHours[];
    menuCategories?: any[];
  };
}

export function RestaurantPage() {
  const { restaurantSlug, locationSlug } = useParams<{ 
    restaurantSlug: string;
    locationSlug?: string;
  }>();
  const navigate = useNavigate();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  
  const { data: restaurant, isLoading } = useQuery<RestaurantData>({
    queryKey: ['restaurant', restaurantSlug, locationSlug],
    queryFn: async () => {
      try {
        // First, fetch the restaurant
        const { data: restaurantData, errors: restaurantErrors } = await client.models.Restaurant.list({
          filter: { slug: { eq: restaurantSlug } },
          selectionSet: ['id', 'name', 'description', 'bannerImageUrl', 'menuCategories.*', 'locations.*', 'isChain', 'timezone']
        });
        
        if (restaurantErrors) throw new Error('Failed to fetch restaurant');
        if (!restaurantData || restaurantData.length === 0) throw new Error('Restaurant not found');
        
        // We need to assert this as any to access properties safely
        const restaurantObj = restaurantData[0] as any;
        
        // Fetch restaurant business hours
        const { data: restaurantHours, errors: restaurantHoursErrors } = await client.models.BusinessHours.list({
          filter: { restaurantId: { eq: restaurantObj.id } },
          selectionSet: ['id', 'restaurantId', 'locationId', 'dayOfWeek', 'isOpen', 'openTime', 'closeTime']
        });
        
        if (restaurantHoursErrors) throw new Error('Failed to fetch restaurant hours');
        
        // If we're looking for a specific location
        if (locationSlug && restaurantObj.id) {
          console.log(`Fetching location with slug: ${locationSlug} for restaurant ID: ${restaurantObj.id}`);
          const { data: locationData, errors: locationErrors } = await client.models.RestaurantLocation.list({
            filter: { 
              slug: { eq: locationSlug },
              restaurantId: { eq: restaurantObj.id }
            },
            selectionSet: ['id', 'name', 'slug', 'description', 'bannerImageUrl', 'address', 'city', 'state', 'zip', 'phoneNumber', 'menuCategories.*', 'timezone']
          });
          
          console.log('Location API response:', { locationData, errors: locationErrors });
          
          if (locationErrors) throw new Error('Failed to fetch location data');
          if (!locationData || locationData.length === 0) throw new Error('Location not found');
          
          // We need to assert this as any to access properties safely
          const locationObj = locationData[0] as any;
          
          // Fetch location business hours
          const { data: locationHours, errors: locationHoursErrors } = await client.models.BusinessHours.list({
            filter: { locationId: { eq: locationObj.id } },
            selectionSet: ['id', 'restaurantId', 'locationId', 'dayOfWeek', 'isOpen', 'openTime', 'closeTime']
          });
          
          if (locationHoursErrors) throw new Error('Failed to fetch location hours');
          
          // Combine restaurant with location data
          return {
            ...restaurantObj,
            name: locationObj.name || restaurantObj.name,
            description: locationObj.description || restaurantObj.description,
            bannerImageUrl: locationObj.bannerImageUrl || restaurantObj.bannerImageUrl,
            timezone: locationObj.timezone || restaurantObj.timezone,
            businessHours: locationHours || restaurantHours || [],
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
          menuCategories: restaurantObj.menuCategories || [],
          businessHours: restaurantHours || []
        } as RestaurantData;
      } catch (error) {
        console.error('Error fetching restaurant:', error);
        throw error;
      }
    }
  });

  const { toggleCart, state } = useCart();
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  // Check if restaurant is open
  const isOpen = restaurant ? isRestaurantOpenFromHours(
    restaurant.timezone || 'America/Los_Angeles',
    restaurant.businessHours || []
  ) : false;

  // Automatically redirect to single location when there's only one location
  useEffect(() => {
    if (!isLoading && restaurant && !locationSlug) {
      const locations = restaurant.locations || [];
      // If there's exactly one location, redirect to it
      if (locations.length === 1 && locations[0].slug) {
        navigate(`/${restaurantSlug}/${locations[0].slug}`, { replace: true });
      }
    }
  }, [restaurant, isLoading, locationSlug, restaurantSlug, navigate]);

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
            <div className="w-full">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{restaurant.name}</h1>
              <p className="mt-2 text-sm md:text-base text-white/90">{restaurant.description}</p>
              
              {/* Restaurant Status */}
              <div className="mt-3">
                <RestaurantStatus
                  timezone={restaurant.timezone || 'America/Los_Angeles'}
                  businessHours={restaurant.businessHours || []}
                  className="text-white"
                />
              </div>
              
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

      {/* Closed Restaurant Notice */}
      {!isOpen && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>Restaurant is currently closed.</strong> Orders cannot be placed at this time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* If this is a chain restaurant without location, show locations picker only if there are multiple locations */}
      {!locationSlug && hasLocations && locations.length > 1 && (
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
              {/* Category Scroll */}
              {hasMenuCategories && isOpen && (
                <div className="mb-6">
                  <CategoryScroll
                    categories={menuCategories}
                    selectedCategoryId={selectedCategoryId}
                    onCategorySelect={setSelectedCategoryId}
                    className="bg-white rounded-lg shadow-sm p-4"
                  />
                </div>
              )}
              
              <div className="space-y-6 pb-20 lg:pb-0">
                {hasMenuCategories && isOpen && menuCategories.map((category: any) => (
                  <MenuCategory 
                    key={category.id} 
                    categoryId={category.id} 
                    restaurantId={restaurant.id || ''}
                    locationId={locationSlug ? restaurant.location?.id : undefined}
                  />
                ))}
                
                {/* If there are no menu categories or restaurant is closed */}
                {(!hasMenuCategories || !isOpen) && (
                  <div className="p-4 bg-white rounded shadow">
                    <p className="text-center text-gray-500">
                      {!isOpen ? 'Restaurant is currently closed' : 'No menu items available'}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Desktop Cart - Fixed width, only visible on large screens */}
            <div className="hidden lg:block w-80 flex-shrink-0 sticky top-24 self-start">
              <Cart 
                restaurantTimezone={restaurant.timezone}
                restaurantBusinessHours={restaurant.businessHours}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Uber Eats Style Floating Cart Button */}
      {itemCount > 0 && isOpen && (
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
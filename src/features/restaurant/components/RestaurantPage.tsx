import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { MenuCategory } from '../../menu/components/MenuCategory';

const client = generateClient<Schema>();

export function RestaurantPage() {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurant', slug],
    queryFn: async () => {
      const { data, errors } = await client.models.Restaurant.list({
        filter: { slug: { eq: slug } },
        selectionSet: ['id', 'name', 'description', 'imageUrl', 'menuCategories.*']
      });
      if (errors) throw new Error('Failed to fetch restaurant');
      return data[0];
    }
  });

  if (isLoading) {
    return <div className="animate-pulse h-screen bg-gray-100" />;
  }

  if (!restaurant) {
    return <div className="h-screen flex items-center justify-center">Restaurant not found</div>;
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section - Fixed height */}
      <div className="relative h-48 md:h-64">
        <img
          src={restaurant.imageUrl ?? ''}
          alt={restaurant.name ?? ''}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50">
          <div className="h-full max-w-7xl mx-auto px-4 flex items-end pb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{restaurant.name}</h1>
              <p className="mt-2 text-sm md:text-base text-white/90">{restaurant.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Menu Content - Takes available space */}
            <div className="flex-1">
              <div className="space-y-6">
                {restaurant.menuCategories?.map((category) => (
                  <MenuCategory 
                    key={category.id} 
                    categoryId={category.id} 
                    restaurantId={restaurant.id}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
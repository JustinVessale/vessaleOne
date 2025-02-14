import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { MenuCategory } from '../../menu/components/MenuCategory';
import { Cart } from '../../cart/components/Cart';

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
    <div className="flex flex-col min-h-screen">
      {/* Restaurant Header */}
      <div className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
          <p className="text-gray-600">{restaurant.description}</p>
        </div>
      </div>

      {/* Menu Categories */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="space-y-8">
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
  );
}
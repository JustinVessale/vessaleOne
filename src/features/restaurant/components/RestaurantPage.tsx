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
        filter: {
          slug: {
            eq: slug
          }
        },
        selectionSet: ['id', 'name', 'description', 'imageUrl', 'menuCategories.id']
      });

      if (errors) {
        console.error('Error fetching restaurant:', errors);
        throw new Error('Failed to fetch restaurant');
      }

      return data[0];
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Restaurant not found</h1>
        <p className="mt-2 text-gray-600">The restaurant you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-64 md:h-96 -mx-4 sm:-mx-6 lg:-mx-8">
        <img
          src={restaurant.imageUrl || ''}
          alt={restaurant.name || ''}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h1 className="text-3xl md:text-4xl font-bold">{restaurant.name}</h1>
          <p className="mt-2 text-lg opacity-90">{restaurant.description}</p>
        </div>
      </div>
      
      <div className="mt-8">
        {restaurant.menuCategories?.map((category) => (
          <MenuCategory key={category.id} categoryId={category.id} />
        ))}
      </div>
    </div>
  );
} 
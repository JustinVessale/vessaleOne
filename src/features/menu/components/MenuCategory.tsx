import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { MenuItem } from './MenuItem';

const client = generateClient<Schema>();

type MenuCategoryProps = {
  categoryId: string;
  restaurantId: string;
};

export function MenuCategory({ categoryId, restaurantId }: MenuCategoryProps) {
  const { data: category, isLoading } = useQuery({
    queryKey: ['menuCategory', categoryId],
    queryFn: async () => {
      const { data, errors } = await client.models.MenuCategory.get(
        { id: categoryId },
        {
          selectionSet: ['id', 'name', 'description', 'menuItems.*']
        }
      );

      if (errors) {
        console.error('Error fetching menu category:', errors);
        throw new Error('Failed to fetch menu category');
      }

      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Category header skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        
        {/* Menu items grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-lg p-4">
              <div className="flex justify-between">
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="ml-4 w-24 h-24 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!category) return null;

  return (
    <section 
      id={`category-${category.id}`}
      className="scroll-mt-16 bg-white rounded-lg p-6 shadow-sm mb-6"
    >
      {/* Category Header - Force new line */}
      <div className="mb-6 w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{category.name}</h2>
        {category.description && (
          <p className="text-gray-600 text-base">{category.description}</p>
        )}
      </div>

      {/* Menu Items Grid - Force grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {category.menuItems?.map((item) => (
          <MenuItem 
            key={item.id} 
            item={{
              id: item.id,
              name: item.name ?? '',
              description: item.description ?? '',
              price: item.price ?? 0,
              imageUrl: item.imageUrl ?? ''
            }}
            restaurantId={restaurantId}
          />
        ))}
      </div>
    </section>
  );
}
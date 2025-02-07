import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { MenuItem } from './MenuItem';

const client = generateClient<Schema>();

type MenuCategoryProps = {
  categoryId: string;
};

export function MenuCategory({ categoryId }: MenuCategoryProps) {
  const { data: category, isLoading } = useQuery({
    queryKey: ['menuCategory', categoryId],
    queryFn: async () => {
      const { data, errors } = await client.models.MenuCategory.get(
        {id: categoryId},
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
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!category) return null;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{category.name}</h2>
      {category.description && (
        <p className="text-gray-600 mb-4">{category.description}</p>
      )}
      <div className="space-y-4">
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
          />
        ))}
      </div>
    </div>
  );
} 
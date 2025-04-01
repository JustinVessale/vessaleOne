import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';
import { Loader2, Plus, PenSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const client = generateClient<Schema>();

export function MenuPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const restId = sessionStorage.getItem('restaurantId');
        if (!restId) return;
        
        setRestaurantId(restId);

        const { data } = await client.models.MenuCategory.list({
          filter: {
            restaurantId: { eq: restId }
          },
          selectionSet: ['id', 'name', 'description', 'menuItems.id', 'menuItems.name', 'menuItems.description', 'menuItems.price', 'menuItems.imageUrl']
        });

        setCategories(data);
      } catch (error) {
        console.error('Error fetching menu data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No menu categories found. Create your first category to get started.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold">{category.name}</h2>
                    <p className="text-gray-500">{category.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <PenSquare className="h-4 w-4 mr-2" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-blue-600">
                      <Plus className="h-4 w-4 mr-2" /> Add Item
                    </Button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {category.menuItems?.length > 0 ? (
                  category.menuItems.map((item: any) => (
                    <div key={item.id} className="p-4 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-16 h-16 object-cover rounded-md"
                          />
                        )}
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="font-semibold">${item.price?.toFixed(2)}</span>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <PenSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No items in this category yet.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
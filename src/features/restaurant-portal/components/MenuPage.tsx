import { useState } from 'react';
import { Plus, Edit, Trash, Search, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define menu category interface
interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

// Define menu item interface
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  isPopular?: boolean;
}

// Sample menu data
const sampleCategories: MenuCategory[] = [
  {
    id: 'cat1',
    name: 'Starters',
    description: 'Begin your meal with these delicious appetizers',
    items: [
      {
        id: 'item1',
        name: 'Caesar Salad',
        description: 'Crisp romaine lettuce, croutons, parmesan cheese with our homemade dressing',
        price: 8.95,
        imageUrl: 'https://source.unsplash.com/random/100x100?salad',
        isAvailable: true,
        isPopular: true
      },
      {
        id: 'item2',
        name: 'Garlic Bread',
        description: 'Fresh baked bread with garlic butter and herbs',
        price: 4.95,
        imageUrl: 'https://source.unsplash.com/random/100x100?bread',
        isAvailable: true
      },
      {
        id: 'item3',
        name: 'Calamari',
        description: 'Lightly fried squid served with marinara sauce',
        price: 11.95,
        imageUrl: 'https://source.unsplash.com/random/100x100?calamari',
        isAvailable: true
      }
    ]
  },
  {
    id: 'cat2',
    name: 'Main Courses',
    description: 'Our chef\'s special entrees',
    items: [
      {
        id: 'item4',
        name: 'Chicken Parmesan',
        description: 'Breaded chicken topped with tomato sauce and mozzarella, served with pasta',
        price: 16.95,
        imageUrl: 'https://source.unsplash.com/random/100x100?chicken',
        isAvailable: true,
        isPopular: true
      },
      {
        id: 'item5',
        name: 'Grilled Salmon',
        description: 'Fresh Atlantic salmon with lemon butter sauce and seasonal vegetables',
        price: 21.95,
        imageUrl: 'https://source.unsplash.com/random/100x100?salmon',
        isAvailable: true
      },
      {
        id: 'item6',
        name: 'Vegetable Stir Fry',
        description: 'Mixed vegetables in our signature sauce served over rice',
        price: 14.95,
        imageUrl: 'https://source.unsplash.com/random/100x100?stirfry',
        isAvailable: false
      }
    ]
  },
  {
    id: 'cat3',
    name: 'Desserts',
    description: 'Sweet treats to end your meal',
    items: [
      {
        id: 'item7',
        name: 'Chocolate Cake',
        description: 'Rich chocolate cake with a molten center',
        price: 7.95,
        imageUrl: 'https://source.unsplash.com/random/100x100?cake',
        isAvailable: true,
        isPopular: true
      },
      {
        id: 'item8',
        name: 'New York Cheesecake',
        description: 'Creamy cheesecake with a graham cracker crust',
        price: 6.95,
        imageUrl: 'https://source.unsplash.com/random/100x100?cheesecake',
        isAvailable: true
      }
    ]
  }
];

// Menu item component
function MenuItemCard({ item, onEdit, onDelete, onToggleAvailability }: { 
  item: MenuItem; 
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
  onToggleAvailability: (itemId: string, isAvailable: boolean) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center mb-1">
              <h3 className="text-lg font-medium">{item.name}</h3>
              {item.isPopular && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  Popular
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{item.description}</p>
            <div className="flex justify-between items-center">
              <span className="font-semibold">${item.price.toFixed(2)}</span>
              <div className="relative">
                <button 
                  className="p-1 rounded-full hover:bg-gray-100"
                  onClick={() => setShowActions(!showActions)}
                >
                  <MoreVertical className="h-5 w-5 text-gray-500" />
                </button>
                {showActions && (
                  <div className="absolute right-0 z-10 mt-1 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                    <button 
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        onEdit(item);
                        setShowActions(false);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Item
                    </button>
                    <button 
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        onToggleAvailability(item.id, !item.isAvailable);
                        setShowActions(false);
                      }}
                    >
                      {item.isAvailable ? 'Mark as Unavailable' : 'Mark as Available'}
                    </button>
                    <button 
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      onClick={() => {
                        onDelete(item.id);
                        setShowActions(false);
                      }}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Item
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {item.imageUrl && (
            <div className="ml-4">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="h-16 w-16 object-cover rounded-md"
              />
            </div>
          )}
        </div>
        <div className="mt-2">
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
            item.isAvailable 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {item.isAvailable ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>(sampleCategories);
  const [searchTerm, setSearchTerm] = useState('');

  //const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const handleEditItem = (item: MenuItem) => {
   // setEditingItem(item);
    // Open edit modal (not implemented in this example)
    console.log('Editing item:', item);
  };

  const handleDeleteItem = (itemId: string) => {
    // In real implementation, show confirmation dialog
    const updatedCategories = categories.map(category => ({
      ...category,
      items: category.items.filter(item => item.id !== itemId)
    }));
    setCategories(updatedCategories);
  };

  const handleToggleAvailability = (itemId: string, isAvailable: boolean) => {
    const updatedCategories = categories.map(category => ({
      ...category,
      items: category.items.map(item => 
        item.id === itemId ? { ...item, isAvailable } : item
      )
    }));
    setCategories(updatedCategories);
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
        <p className="text-gray-600 mt-1">Manage your restaurant menu items</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search menu items..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No menu items found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredCategories.map(category => (
            <div key={category.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold">{category.name}</h2>
                    {category.description && (
                      <p className="text-gray-600 text-sm mt-1">{category.description}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Category
                  </Button>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onToggleAvailability={handleToggleAvailability}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
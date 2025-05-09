import { useState, useRef, useEffect } from 'react';
import { Plus, Edit, Trash, Search, MoreVertical, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSelectedLocation } from '../hooks/useSelectedLocation';
import { EditMenuItemModal } from './EditMenuItemModal';
import { useRestaurantContext } from '../context/RestaurantContext';
import { StorageImage } from '@/components/ui/s3-image';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { useQuery } from '@tanstack/react-query';
import { uploadImage, getImageUrl } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

const client = generateClient<Schema>();

// Define types using the generated Schema - export so they can be used by EditMenuItemModal
export type MenuItemType = Schema['MenuItem']['type'];
export type MenuCategoryType = Schema['MenuCategory']['type'];

// Extended types for UI-specific properties
export type MenuItemUI = MenuItemType & {
  isAvailable?: boolean;
  isPopular?: boolean;
};

export type MenuCategoryWithItems = MenuCategoryType & {
  items: MenuItemUI[];
};

// Menu item component
function MenuItemCard({ item, onEdit, onDelete, onToggleAvailability }: { 
  item: MenuItemUI; 
  onEdit: (item: MenuItemUI) => void;
  onDelete: (itemId: string) => void;
  onToggleAvailability: (itemId: string, isAvailable: boolean) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  // Handle click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    }
    
    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);
  
  // Position the menu when it's shown
  useEffect(() => {
    if (showActions && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.top,
        left: rect.left - 120, // Position to the left of the button
      });
    }
  }, [showActions]);

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
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{item.description || ''}</p>
            <div className="flex items-center">
              <span className="font-semibold">${(item.price || 0).toFixed(2)}</span>
            </div>
          </div>
          {item.imageUrl && (
            <div className="ml-4">
              <StorageImage 
                src={item.imageUrl} 
                alt={item.name || 'Menu item'} 
                className="h-16 w-16 object-cover rounded-md"
                width={64}
                height={64}
                fallbackSrc="/placeholder-food.jpg"
              />
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
            item.isAvailable !== false
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {item.isAvailable !== false ? 'Available' : 'Unavailable'}
          </span>
          
          <div className="relative">
            <button 
              ref={buttonRef}
              className="p-2 rounded-full hover:bg-gray-100 flex items-center justify-center"
              onClick={() => setShowActions(!showActions)}
              aria-label="Menu options"
            >
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </button>
            
            {showActions && (
              <div 
                ref={menuRef}
                className="fixed z-50 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5"
                style={{
                  top: `${menuPosition.top - 120}px`, // Position above the button
                  left: `${menuPosition.left}px`
                }}
              >
                <button 
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-100"
                  onClick={() => {
                    onEdit(item);
                    setShowActions(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Item
                </button>
                <button 
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-100"
                  onClick={() => {
                    onToggleAvailability(item.id, !(item.isAvailable !== false));
                    setShowActions(false);
                  }}
                >
                  {item.isAvailable !== false ? 'Mark as Unavailable' : 'Mark as Available'}
                </button>
                <button 
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50"
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
    </div>
  );
}

export function MenuPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { locationName, hasLocation, locationId } = useSelectedLocation();
  const { restaurant } = useRestaurantContext();
  const { toast } = useToast();
  
  // Add state for edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemUI | null>(null);

  // Banner image state
  const [bannerImageUrl, setBannerImageUrl] = useState<string | undefined>(
    (location as any)?.bannerImageUrl || (restaurant as any)?.bannerImageUrl
  );
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Fetch menu categories and items
  const { data: categories = [], isLoading, error, refetch } = useQuery<MenuCategoryWithItems[]>({
    queryKey: ['menuCategories', restaurant?.id, locationId],
    queryFn: async () => {
      if (!restaurant?.id) {
        throw new Error('Restaurant ID not found');
      }
      
      // Define filter to fetch restaurant or location-specific menu categories
      const categoryFilter = locationId 
        ? { 
            and: [
              { restaurantId: { eq: restaurant.id } },
              { or: [
                { locationId: { eq: locationId } },
                { locationId: { attributeExists: false } }
              ]}
            ] 
          }
        : { restaurantId: { eq: restaurant.id } };
        
      const { data: categoriesData, errors: categoryErrors } = await client.models.MenuCategory.list({
        filter: categoryFilter,
        selectionSet: ['id', 'name', 'description']
      });
      
      if (categoryErrors) {
        console.error('Error fetching menu categories:', categoryErrors);
        throw new Error('Failed to fetch menu categories');
      }
      
      if (!categoriesData || categoriesData.length === 0) {
        return [];
      }
      
      // For each category, fetch its menu items
      const categoriesWithItems = await Promise.all(
        categoriesData.map(async (category) => {
          const { data: menuItems, errors: menuItemErrors } = await client.models.MenuItem.list({
            filter: { categoryId: { eq: category.id } },
            selectionSet: ['id', 'name', 'description', 'price', 'imageUrl', 'categoryId']
          });
          
          if (menuItemErrors) {
            console.error(`Error fetching menu items for category ${category.id}:`, menuItemErrors);
            return {
              ...category,
              items: []
            };
          }
          
          // Transform menu items to match our interface by adding UI properties
          const items = menuItems?.map(item => ({
            ...item,
            isAvailable: true, // Default to true since availability status is not in the schema
            isPopular: false,   // Default to false since popularity status is not in the schema
          })) || [];
          
          return {
            ...category,
            items
          };
        })
      );
      
      return categoriesWithItems as MenuCategoryWithItems[];
    },
    enabled: !!restaurant?.id
  });

  // Fetch banner image from location or restaurant object if available
  useEffect(() => {
    setBannerImageUrl((location as any)?.bannerImageUrl || (restaurant as any)?.bannerImageUrl);
  }, [location, restaurant]);

  // Banner image upload handler
  const handleBannerImageSelected = (file: File) => {
    setBannerImageFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleRemoveBannerImage = () => {
    setBannerImageFile(null);
    setBannerPreview(null);
  };

  const handleSaveBannerImage = async () => {
    if (!restaurant?.id || !locationId || !bannerImageFile) return;
    setIsBannerUploading(true);
    try {
      // Compose S3 path
      const path = `restaurant/${restaurant.id}/${locationId}/banner`;
      const fileName = `${Date.now()}-${bannerImageFile.name.replace(/\s+/g, '-').toLowerCase()}`;
      const fullPath = `${path}/${fileName}`;
      // Upload
      await uploadImage(bannerImageFile, path);
      // Get public URL
      const url = await getImageUrl(fullPath);
      setBannerImageUrl(url);
      setBannerImageFile(null);
      setBannerPreview(null);
      // Save the bannerImageUrl to the RestaurantLocation model
      await client.models.RestaurantLocation.update({
        id: locationId,
        bannerImageUrl: url,
      });
      toast({ title: 'Banner updated', variant: 'default' });
    } catch (err) {
      toast({ title: 'Banner upload failed', variant: 'destructive' });
    } finally {
      setIsBannerUploading(false);
    }
  };

  const handleEditItem = (item: MenuItemUI) => {
    setEditingItem(item);
    setEditModalOpen(true);
  };
  
  const handleAddItem = () => {
    setEditingItem(null); // null indicates a new item
    setEditModalOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const { errors } = await client.models.MenuItem.delete({
          id: itemId
        });
        
        if (errors) {
          console.error('Error deleting menu item:', errors);
          alert('Failed to delete menu item. Please try again.');
          return;
        }
        
        // Refetch menu data
        refetch();
      } catch (error) {
        console.error('Error deleting menu item:', error);
        alert('Failed to delete menu item. Please try again.');
      }
    }
  };

  const handleToggleAvailability = async (itemId: string, isAvailable: boolean) => {
    // Note: Since availability is not in the current schema, this would need schema modification
    // For now, we'll update the item in the local state only
    try {
      console.log(`Toggling availability for item ${itemId} to ${isAvailable}`);
      
      // In a real implementation, you would update the menu item in the database
      // await client.models.MenuItem.update({
      //   id: itemId,
      //   isAvailable
      // });
      
      // For now, just refetch to simulate an update
      refetch();
    } catch (error) {
      console.error('Error updating menu item availability:', error);
      alert('Failed to update menu item availability. Please try again.');
    }
  };
  
  const handleSaveMenuItem = async (updatedItem: MenuItemUI) => {
    try {
      // Determine if this is an edit or an add
      const isEditing = !!editingItem;
      
      if (isEditing) {
        // Update existing item
        const { errors } = await client.models.MenuItem.update({
          id: updatedItem.id,
          name: updatedItem.name,
          description: updatedItem.description,
          price: updatedItem.price,
          imageUrl: updatedItem.imageUrl
        });
        
        if (errors) {
          console.error('Error updating menu item:', errors);
          alert('Failed to update menu item. Please try again.');
          return;
        }
      } else {
        // Add new item
        const { errors } = await client.models.MenuItem.create({
          name: updatedItem.name,
          description: updatedItem.description,
          price: updatedItem.price,
          imageUrl: updatedItem.imageUrl,
          categoryId: updatedItem.categoryId
        });
        
        if (errors) {
          console.error('Error creating menu item:', errors);
          alert('Failed to create menu item. Please try again.');
          return;
        }
      }
      
      // Refetch menu data
      refetch();
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Failed to save menu item. Please try again.');
    }
  };

  // Filter categories and items based on search term
  const filteredCategories = categories.map(category => ({
    ...category,
    items: category.items.filter(item => 
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        <div className="h-64 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        <p>Error loading menu: {(error as Error).message}</p>
        <Button 
          onClick={() => refetch()}
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Banner Image Section */}
      <div className="mb-8 bg-white rounded-lg shadow p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-2">Banner Image</h2>
          <p className="text-gray-500 text-sm mb-4">This image will be displayed as the banner for your restaurant's menu page.</p>
          <div className="flex items-center gap-6">
            {/* Current or Preview Banner */}
            <div className="relative w-64 h-32 border rounded overflow-hidden flex items-center justify-center bg-gray-50">
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner preview" className="object-cover w-full h-full" />
              ) : bannerImageUrl ? (
                <StorageImage src={bannerImageUrl} alt="Current banner" className="object-cover w-full h-full" />
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                  <ImageIcon className="h-10 w-10 mb-2" />
                  <span>No banner image</span>
                </div>
              )}
              {bannerPreview && (
                <button
                  type="button"
                  onClick={handleRemoveBannerImage}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Upload Controls */}
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                id="banner-upload"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) handleBannerImageSelected(e.target.files[0]);
                }}
                disabled={isBannerUploading}
              />
              <label htmlFor="banner-upload">
                <Button asChild variant="outline" disabled={isBannerUploading}>
                  <span><Upload className="h-4 w-4 mr-2" />{bannerPreview ? 'Change' : 'Upload'} Banner</span>
                </Button>
              </label>
              {bannerPreview && (
                <Button onClick={handleSaveBannerImage} disabled={isBannerUploading}>
                  {isBannerUploading ? 'Saving...' : 'Save Banner'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
        {hasLocation && locationName && (
          <p className="text-gray-600 mt-1">Managing menu for location: {locationName}</p>
        )}
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
        <Button onClick={handleAddItem}>
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
      
      {/* Edit Menu Item Modal */}
      {editModalOpen && (
        <EditMenuItemModal
          item={editingItem}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={handleSaveMenuItem}
          restaurantId={restaurant?.id || ''}
        />
      )}
    </div>
  );
} 
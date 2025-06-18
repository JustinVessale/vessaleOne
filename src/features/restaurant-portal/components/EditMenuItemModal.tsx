import { useState, useEffect } from 'react';
import type { Schema } from '../../../../amplify/data/resource';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ImageUploader } from '@/components/ui/image-uploader';
import { menuItemImageHelper } from '@/lib/storage';
import { useSelectedLocation } from '../hooks/useSelectedLocation';
import { generateClient } from 'aws-amplify/api';
import { useQuery } from '@tanstack/react-query';

const client = generateClient<Schema>();

// Define types using the generated Schema
type MenuItemType = Schema['MenuItem']['type'];
type MenuCategoryType = Schema['MenuCategory']['type'];

// Extended type for UI-specific properties
type MenuItemUI = MenuItemType & {
  isAvailable?: boolean;
  isPopular?: boolean;
};

interface EditMenuItemModalProps {
  item: MenuItemUI | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MenuItemUI) => void;
  restaurantId: string;
}

export function EditMenuItemModal({ 
  item, 
  isOpen, 
  onClose, 
  onSave,
  restaurantId 
}: EditMenuItemModalProps) {
  const { toast } = useToast();
  const { locationId = 'default' } = useSelectedLocation();
  
  // Fetch available categories
  const { data: categories = [] } = useQuery<MenuCategoryType[]>({
    queryKey: ['menuCategories', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, errors } = await client.models.MenuCategory.list({
        filter: { 
          restaurantId: { eq: restaurantId },
          locationId: { attributeExists: false }
        }
      });
      
      if (errors) {
        console.error('Error fetching categories:', errors);
        return [];
      }
      
      return data || [];
    },
    enabled: !!restaurantId
  });
  
  // Initialize state with the item data or defaults for a new item
  const [formData, setFormData] = useState<MenuItemUI>(
    item || {
      id: '',
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      isAvailable: true,
      isPopular: false,
      categoryId: ''
    } as MenuItemUI
  );
  
  // Reset form data when modal opens/closes or when item changes
  useEffect(() => {
    if (isOpen) {
      setFormData(
        item || {
          id: '',
          name: '',
          description: '',
          price: 0,
          imageUrl: '',
          isAvailable: true,
          isPopular: false,
          categoryId: categories.length > 0 ? categories[0].id : ''
        } as MenuItemUI
      );
    }
  }, [isOpen, item, categories]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) : value
    }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleImageSelected = (file: File) => {
    setImageFile(file);
    setRemoveImage(false);
  };

  const handleResetImage = () => {
    setRemoveImage(true);
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name?.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    if (!formData.categoryId) {
      toast({ title: 'Please select a category', variant: 'destructive' });
      return;
    }

    if (!formData.price || formData.price <= 0) {
      toast({ title: 'Price must be greater than 0', variant: 'destructive' });
      return;
    }

    let newImageUrl = formData.imageUrl;
    const oldImageUrl = item?.imageUrl;

    try {
      if (imageFile) {
        setIsUploading(true);
        try {
          const uploadResult = await menuItemImageHelper.upload(
            imageFile, 
            restaurantId, 
            formData.id || 'new',
            locationId
          );
          // Store the storage key instead of the pre-signed URL
          newImageUrl = uploadResult.key;
          // Delete the old image if it exists and is different from the new one
          if (oldImageUrl && oldImageUrl !== newImageUrl) {
            menuItemImageHelper.delete(oldImageUrl).catch((deleteError) => {
              console.warn('Failed to delete old image:', deleteError);
            });
          }
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          let errorTitle = "Image Upload Failed";
          let continueWithSave = false;
          if (uploadError.message?.includes('AccessDenied') || 
              uploadError.message?.includes('not authorized') ||
              uploadError.code === 'AccessDenied') {
            const confirmed = window.confirm(
              "Unable to upload the image due to permission issues. Would you like to save the item without updating the image?"
            );
            if (confirmed) {
              continueWithSave = true;
            } else {
              setIsUploading(false);
              return; // Stop the form submission
            }
          } else {
            setTimeout(() => {
              toast({
                title: errorTitle,
                variant: "destructive",
                duration: 3,
                className: "bg-red-100 border-red-400 text-red-800 border"
              });
            }, 100);
            setIsUploading(false);
            return; // Stop the form submission
          }
          if (!continueWithSave) {
            setIsUploading(false);
            return;
          }
        }
      } else if (removeImage) {
        // If user clicked the remove button, clear the image URL
        newImageUrl = '';
        
        // Delete the old image if it exists
        if (oldImageUrl) {
          try {
            await menuItemImageHelper.delete(oldImageUrl).catch(err => {
              console.warn('Failed to delete old image:', err);
            });
          } catch (deleteError) {
            console.warn('Failed to delete old image:', deleteError);
            // Continue with save even if deletion fails
          }
        }
      }
      
      onSave({
        ...formData,
        imageUrl: newImageUrl,
      });
      setImageFile(null);
      setRemoveImage(false);
      onClose();
    } catch (error: any) {
      console.error('Error saving menu item:', error);
      setTimeout(() => {
        toast({
          title: "Save Failed",
          variant: "destructive",
          duration: 3,
          className: "bg-red-100 border-red-400 text-red-800 border"
        });
      }, 100);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-xl bg-white border-0 rounded-md shadow-lg !p-0 overflow-hidden">
        <div className="bg-white w-full">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {item ? 'Edit' : 'Add'} Menu Item
              </h2>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleChange}
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-gray-700">Price ($)</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price || 1}
                      onChange={handleChange}
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Category Selector */}
                <div className="space-y-2">
                  <Label htmlFor="categoryId" className="text-gray-700">Category</Label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    value={formData.categoryId || ''}
                    onChange={handleChange}
                    disabled={categories.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">
                      {categories.length === 0 ? "No categories available" : "Select a category"}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-sm text-red-600">
                      No categories found. Please create a category first.
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-700">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    rows={3}
                    className="border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-gray-700">Image</Label>
                  <ImageUploader
                    onImageSelected={handleImageSelected}
                    onReset={handleResetImage}
                    previewUrl={removeImage ? undefined : (formData.imageUrl || undefined)}
                    isUploading={isUploading}
                  />
                </div>
                
                <div className="flex items-center space-x-8 mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <input 
                        type="checkbox"
                        id="isAvailable"
                        checked={formData.isAvailable}
                        onChange={(e) => handleSwitchChange('isAvailable', e.target.checked)}
                        className="sr-only"
                      />
                      <div 
                        className={`block w-14 h-8 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${formData.isAvailable ? 'bg-blue-500' : 'bg-gray-300'}`}
                        onClick={() => handleSwitchChange('isAvailable', !formData.isAvailable)}
                      >
                        <div 
                          className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ease-in-out transform ${formData.isAvailable ? 'translate-x-6' : 'translate-x-0'}`}
                        />
                      </div>
                    </div>
                    <Label htmlFor="isAvailable" className="text-gray-700">Available</Label>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 border-t pt-4 flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isUploading || categories.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isUploading ? 'Uploading...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
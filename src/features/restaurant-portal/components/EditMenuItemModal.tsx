import { useState } from 'react';
import { Dialog, DialogContent} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '@/components/ui/image-uploader';
import { menuItemImageHelper } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useSelectedLocation } from '../hooks/useSelectedLocation';
import { StorageImage } from '@/components/ui/s3-image';
import type { Schema } from '../../../../amplify/data/resource';

// Define types using the generated Schema
type MenuItemType = Schema['MenuItem']['type'];

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
  
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      }
      onSave({
        ...formData,
        imageUrl: newImageUrl,
      });
      setImageFile(null);
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
                    previewUrl={formData.imageUrl || undefined}
                    isUploading={isUploading}
                  />
                  {formData.imageUrl && !imageFile && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Current image:</p>
                      <div className="w-32 h-32 relative rounded overflow-hidden border border-gray-200">
                        <StorageImage 
                          src={formData.imageUrl} 
                          alt="Menu item image"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
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
                  disabled={isUploading}
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
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
    
    try {
      // If there's a new image file, upload it
      if (imageFile) {
        setIsUploading(true);
        const uploadResult = await menuItemImageHelper.upload(
          imageFile, 
          restaurantId, 
          formData.id || 'new', // Use 'new' as a placeholder for new items
          locationId
        );
        
        // Update the form data with the new image URL
        setFormData(prev => ({
          ...prev,
          imageUrl: uploadResult.url
        }));
        
        setIsUploading(false);
      }
      
      // Call the onSave function with the updated data
      onSave({
        ...formData,
        // If we just uploaded a new image, use that URL
        imageUrl: imageFile ? formData.imageUrl : formData.imageUrl
      });
      
      // Reset state
      setImageFile(null);
      onClose();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({
        title: 'Error',
        description: 'Failed to save the menu item. Please try again.',
        variant: 'destructive'
      });
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} Menu Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price || 1}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Image</Label>
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
            
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked: boolean) => handleSwitchChange('isAvailable', checked)}
                />
                <Label htmlFor="isAvailable">Available</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPopular"
                  checked={formData.isPopular || false}
                  onCheckedChange={(checked: boolean) => handleSwitchChange('isPopular', checked)}
                />
                <Label htmlFor="isPopular">Popular Item</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
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
            >
              {isUploading ? 'Uploading...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
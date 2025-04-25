import { generateClient } from "aws-amplify/api";
import { type Schema } from "../../amplify/data/resource";
import { getMenuItemImageUrl, uploadMenuItemImage } from "./storage-utils";

// Create an API client for the models
const client = generateClient<Schema>();

/**
 * Utility functions for handling menu items and their images
 */

/**
 * Create a menu item with an image
 * 
 * @param menuItemData - The menu item data to create
 * @param imageFile - Optional image file to upload
 * @returns The created menu item
 */
export const createMenuItemWithImage = async (
  menuItemData: {
    name: string;
    description: string;
    price: number;
    categoryId: string;
    restaurantId: string;
  },
  imageFile?: File
) => {
  try {
    // Generate a slug-like filename based on the menu item name
    const imageName = menuItemData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Prepare the menu item data
    const itemData: Record<string, any> = {
      ...menuItemData,
    };
    
    // If an image file was provided, upload it
    if (imageFile) {
      // Use the file extension from the original file
      const extension = imageFile.name.split('.').pop() || 'jpg';
      const filename = `${imageName}.${extension}`;
      
      // Upload the image to S3
      const uploadResult = await uploadMenuItemImage(
        menuItemData.restaurantId,
        imageFile,
        filename
      );
      
      if (uploadResult.success) {
        // Add the image path to the menu item data
        itemData.imagePath = uploadResult.key;
      } else {
        console.error('Error uploading image:', uploadResult.error);
      }
    }
    
    // Create the menu item
    const result = await client.models.MenuItem.create(itemData);
    return result.data;
  } catch (error) {
    console.error('Error creating menu item:', error);
    throw error;
  }
};

/**
 * Update a menu item with an optional new image
 * 
 * @param menuItemId - The ID of the menu item to update
 * @param updateData - The fields to update
 * @param imageFile - Optional new image file to upload
 * @returns The updated menu item
 */
export const updateMenuItemWithImage = async (
  menuItemId: string,
  updateData: {
    name?: string;
    description?: string;
    price?: number;
    restaurantId: string;
  },
  imageFile?: File
) => {
  try {
    // Get the current menu item
    const currentItem = await client.models.MenuItem.get({
      id: menuItemId
    });
    
    if (!currentItem.data) {
      throw new Error(`Menu item with ID ${menuItemId} not found`);
    }
    
    // Prepare the update data
    const itemData: Record<string, any> = { ...updateData };
    
    // If an image file was provided, upload it
    if (imageFile) {
      // Use the existing image name or generate a new one based on the menu item name
      const currentName = currentItem.data.name || '';
      const imageName = updateData.name
        ? updateData.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
        : (currentItem.data.imagePath?.split('/').pop()?.split('.')[0] || 
          currentName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''));
      
      // Use the file extension from the original file
      const extension = imageFile.name.split('.').pop() || 'jpg';
      const filename = `${imageName}.${extension}`;
      
      // Upload the image to S3
      const uploadResult = await uploadMenuItemImage(
        updateData.restaurantId,
        imageFile,
        filename
      );
      
      if (uploadResult.success) {
        // Add the image path to the update data
        itemData.imagePath = uploadResult.key;
      } else {
        console.error('Error uploading image:', uploadResult.error);
      }
    }
    
    // Update the menu item
    const result = await client.models.MenuItem.update({
      id: menuItemId,
      ...itemData
    });
    
    return result.data;
  } catch (error) {
    console.error('Error updating menu item:', error);
    throw error;
  }
};

/**
 * Get the image URL for a menu item
 * 
 * @param menuItem - The menu item with imagePath property
 * @returns The URL for the menu item's image
 */
export const getMenuItemImage = async (menuItem: { imagePath?: string }) => {
  if (!menuItem.imagePath) {
    return null;
  }
  
  try {
    const result = await getMenuItemImageUrl(menuItem.imagePath);
    return result.success ? result.url : null;
  } catch (error) {
    console.error('Error getting menu item image URL:', error);
    return null;
  }
}; 
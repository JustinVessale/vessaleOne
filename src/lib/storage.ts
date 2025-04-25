import { uploadData, getUrl, remove, downloadData } from 'aws-amplify/storage';

/**
 * Utility functions for managing storage operations for restaurant images
 */

/**
 * Constructs the storage key path for a restaurant's image
 */
export const getRestaurantImageKey = (restaurantId: string, locationId = 'default') => {
  return `restaurant/${restaurantId}/${locationId}/image`;
};

/**
 * Constructs the storage key path for a menu item's image
 */
export const getMenuItemImageKey = (restaurantId: string, locationId = 'default', menuItemId: string) => {
  return `menu/${restaurantId}/${locationId}/menuItems/${menuItemId}`;
};

/**
 * Uploads an image file to storage
 * @param file - The file to upload
 * @param path - The storage key path
 * @returns The URL of the uploaded file
 */
export const uploadImage = async (file: File, path: string) => {
  try {
    // Generate a unique file name using the original name and timestamp
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;
    const fullPath = `${path}/${fileName}`;
    
    // Upload the file using Amplify Storage
    const result = await uploadData({
      key: fullPath,
      data: file,
      options: {
        contentType: file.type,
      }
    }).result;
    
    // Get the public URL for the uploaded file
    const imageUrl = await getImageUrl(fullPath);
    
    return { key: fullPath, url: imageUrl };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Gets the public URL for an image
 * @param key - The storage key for the image
 * @returns The public URL for the image
 */
export const getImageUrl = async (key: string) => {
  try {
    const { url } = await getUrl({
      key,
      options: {
        validateObjectExistence: true,
        expiresIn: 3600 // URL expires in 1 hour
      }
    });
    
    return url.toString();
  } catch (error) {
    console.error('Error getting image URL:', error);
    throw error;
  }
};

/**
 * Deletes an image from storage
 * @param key - The storage key for the image
 */
export const deleteImage = async (key: string) => {
  try {
    await remove({ key });
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Extracts the storage key from a URL
 * @param url - The storage URL
 * @returns The storage key
 */
export const getKeyFromUrl = (url: string) => {
  // Extract the key portion from the URL
  // This is a simple implementation and might need adjustments based on your URL structure
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  // Remove the leading slash if present
  return path.startsWith('/') ? path.substring(1) : path;
};

/**
 * Helper to handle images for restaurants
 */
export const restaurantImageHelper = {
  upload: async (file: File, restaurantId: string, locationId = 'default') => {
    const path = getRestaurantImageKey(restaurantId, locationId);
    return await uploadImage(file, path);
  },
  
  delete: async (url: string) => {
    const key = getKeyFromUrl(url);
    return await deleteImage(key);
  }
};

/**
 * Helper to handle images for menu items
 */
export const menuItemImageHelper = {
  upload: async (file: File, restaurantId: string, menuItemId: string, locationId = 'default') => {
    const path = getMenuItemImageKey(restaurantId, locationId, menuItemId);
    return await uploadImage(file, path);
  },
  
  delete: async (url: string) => {
    const key = getKeyFromUrl(url);
    return await deleteImage(key);
  }
}; 
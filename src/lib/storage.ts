import { uploadData, getUrl, remove } from 'aws-amplify/storage';

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
 * @returns The storage key and URL of the uploaded file
 */
export const uploadImage = async (file: File, path: string) => {
  try {
    // Generate a unique file name using the original name and timestamp
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;
    const fullPath = `${path}/${fileName}`;
    
    // Upload the file using Amplify Storage
    const operation = uploadData({
      path: fullPath,
      data: file,
      options: {
        contentType: file.type,
      }
    });
    
    // Wait for the upload to complete
    await operation.result;
    
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
    // Remove validateObjectExistence to prevent 403 errors
    const { url } = await getUrl({
      path: key,
      options: {
        expiresIn: 86400 // URL expires in 24 hours
      }
    });
    
    return url.toString();
  } catch (error) {
    console.error('Error getting image URL:', error);
    // If we get a 403 error, it might be because the object doesn't exist
    // or because of CORS issues. Let's log more details to help debug.
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    throw error;
  }
};

/**
 * Deletes an image from storage
 * @param key - The storage key for the image
 */
export const deleteImage = async (key: string) => {
  try {
    await remove({ path: key });
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
  // If the URL is already a storage key (doesn't start with http), return it as is
  if (!url.startsWith('http')) {
    return url;
  }
  
  try {
    // Extract the key portion from the URL
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    // Remove the leading slash if present
    return path.startsWith('/') ? path.substring(1) : path;
  } catch (error) {
    console.error('Error extracting key from URL:', error);
    return url; // Return the original URL if we can't parse it
  }
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
import { uploadData, getUrl, remove, list } from 'aws-amplify/storage';

/**
 * Utility functions for handling restaurant image storage
 */

/**
 * Upload a menu item image to the restaurant's storage
 * @param restaurantId - ID of the restaurant
 * @param locationId - ID of the location (use 'default' for main location)
 * @param file - File object to upload
 * @param filename - Optional custom filename (default: original filename)
 * @returns Promise with the upload result
 */
export const uploadMenuItemImage = async (
  restaurantId: string,
  file: File,
  filename?: string,
  locationId: string = 'default'
) => {
  const path = `${restaurantId}/${locationId}/${filename || file.name}`;
  try {
    const result = await uploadData({
      path,
      data: file,
    }).result;
    return { success: true, key: path, result };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { success: false, error };
  }
};

/**
 * Get the URL for a restaurant menu item image
 * @param imagePath - Full path to the image
 * @returns Promise with the image URL
 */
export const getMenuItemImageUrl = async (imagePath: string) => {
  try {
    const { url } = await getUrl({ path: imagePath });
    return { url: url.toString(), success: true };
  } catch (error) {
    console.error('Error getting image URL:', error);
    return { success: false, error };
  }
};

/**
 * Get the URL for a menu item by constructing the path
 * @param restaurantId - ID of the restaurant
 * @param locationId - ID of the location (use 'default' for main location)
 * @param filename - Filename of the image
 * @returns Promise with the image URL
 */
export const getMenuItemImageUrlByParts = async (
  restaurantId: string,
  filename: string,
  locationId: string = 'default'
) => {
  const path = `${restaurantId}/${locationId}/${filename}`;
  return getMenuItemImageUrl(path);
};

/**
 * Delete a menu item image
 * @param imagePath - Full path to the image
 * @returns Promise with the deletion result
 */
export const deleteMenuItemImage = async (imagePath: string) => {
  try {
    await remove({ path: imagePath });
    return { success: true };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, error };
  }
};

/**
 * List all images for a restaurant location
 * @param restaurantId - ID of the restaurant
 * @param locationId - ID of the location (use 'default' for main location)
 * @returns Promise with array of image keys
 */
export const listRestaurantImages = async (
  restaurantId: string,
  locationId: string = 'default'
) => {
  try {
    const pathPrefix = `${restaurantId}/${locationId}/`;
    const result = await list({ path: pathPrefix });
    return { 
      success: true, 
      items: result.items 
    };
  } catch (error) {
    console.error('Error listing images:', error);
    return { success: false, error };
  }
}; 
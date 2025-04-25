import { useState } from 'react';
import { uploadImage, getImageUrl, deleteImage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface UseStorageImageOptions {
  /**
   * Initial image URL
   */
  initialUrl?: string;
  
  /**
   * Base path where images should be stored
   */
  basePath: string;
  
  /**
   * Optional callback when image is uploaded successfully
   */
  onUploadSuccess?: (url: string, key: string) => void;
  
  /**
   * Optional callback when image is deleted successfully
   */
  onDeleteSuccess?: () => void;
}

/**
 * Custom hook for handling image uploads with Amplify Storage
 */
export function useStorageImage(options: UseStorageImageOptions) {
  const { initialUrl, basePath, onUploadSuccess, onDeleteSuccess } = options;
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { toast } = useToast();
  
  /**
   * Upload an image to Amplify Storage
   */
  const uploadImageToStorage = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await uploadImage(file, basePath);
      setImageUrl(result.url);
      
      if (onUploadSuccess) {
        onUploadSuccess(result.url, result.key);
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to upload image');
      setError(error);
      toast({
        title: 'Upload Error',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Delete the current image from Amplify Storage
   */
  const deleteImageFromStorage = async (urlToDelete?: string) => {
    const urlToRemove = urlToDelete || imageUrl;
    
    if (!urlToRemove) {
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await deleteImage(urlToRemove);
      setImageUrl(undefined);
      
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete image');
      setError(error);
      toast({
        title: 'Delete Error',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Get the URL for an image from its key
   */
  const getUrl = async (key: string) => {
    try {
      return await getImageUrl(key);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get image URL');
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };
  
  return {
    imageUrl,
    setImageUrl,
    isLoading,
    error,
    uploadImage: uploadImageToStorage,
    deleteImage: deleteImageFromStorage,
    getImageUrl: getUrl
  };
} 
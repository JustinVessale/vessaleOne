import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/storage';

interface StorageImageProps extends React.HTMLAttributes<HTMLImageElement> {
  /**
   * The storage key or full URL of the image
   */
  src: string;
  
  /**
   * Fallback image to display if the storage image fails to load
   */
  fallbackSrc?: string;
  
  /**
   * Alt text for the image
   */
  alt: string;
  
  /**
   * Additional class name for the image
   */
  className?: string;
  
  /**
   * Whether to attempt to load the image from storage or use as-is
   * If true, the src prop is treated as a storage key
   * If false, the src prop is treated as a regular URL
   */
  useStorage?: boolean;
  
  /**
   * Width of the image
   */
  width?: number | string;
  
  /**
   * Height of the image
   */
  height?: number | string;
}

/**
 * Component for displaying images from Amplify Storage with proper handling
 */
export function StorageImage({
  src,
  fallbackSrc = '/placeholder-image.jpg',
  alt,
  className = '',
  useStorage = true,
  width,
  height,
  ...props
}: StorageImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(fallbackSrc);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  
  useEffect(() => {
    // If src is empty or we're not using storage, don't try to fetch
    if (!src || !useStorage) {
      setImageSrc(src || fallbackSrc);
      setIsLoading(false);
      return;
    }
    
    // Check if src is already a URL
    if (src.startsWith('http')) {
      setImageSrc(src);
      setIsLoading(false);
      return;
    }
    
    // Fetch the storage URL
    const fetchUrl = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        const url = await getImageUrl(src);
        setImageSrc(url);
      } catch (error) {
        console.error('Error loading image from storage:', error);
        setHasError(true);
        setImageSrc(fallbackSrc);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUrl();
  }, [src, fallbackSrc, useStorage]);
  
  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImageSrc(fallbackSrc);
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <span className="sr-only">Loading...</span>
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200 ${className}`}
        onError={handleError}
        width={width}
        height={height}
        {...props}
      />
    </div>
  );
}

// Export the old name for backward compatibility
export const S3Image = StorageImage; 
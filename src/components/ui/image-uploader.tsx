/**
 * UI component that provides a user interface for selecting and previewing images before upload.
 * Handles the file selection process but delegates the actual upload to a callback function.
 */
import { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { getImageUrl } from '@/lib/storage';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  onReset?: () => void;
  previewUrl?: string;
  className?: string;
  accept?: string;
  label?: string;
  isUploading?: boolean;
}

export function ImageUploader({
  onImageSelected,
  onReset,
  previewUrl,
  className = '',
  accept = 'image/*',
  label = 'Upload Image',
  isUploading = false
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle preview URL changes
  useEffect(() => {
    const loadPreview = async () => {
      if (!previewUrl) {
        setPreview(null);
        return;
      }

      try {
        // If it's a storage key, get a pre-signed URL
        if (!previewUrl.startsWith('http')) {
          const url = await getImageUrl(previewUrl);
          setPreview(url);
        } else {
          setPreview(previewUrl);
        }
      } catch (error) {
        console.error('Error loading preview:', error);
        setPreview(null);
      }
    };

    loadPreview();
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onImageSelected(file);
    
    // Reset input value so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    if (onReset) onReset();
    
    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
          disabled={isUploading}
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={handleBrowseClick}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {label}
        </Button>
        
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveImage}
            disabled={isUploading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
            Remove
          </Button>
        )}
      </div>
      
      {preview ? (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
    </div>
  );
} 
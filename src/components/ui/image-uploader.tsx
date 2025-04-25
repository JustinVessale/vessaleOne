/**
 * UI component that provides a user interface for selecting and previewing images before upload.
 * Handles the file selection process but delegates the actual upload to a callback function.
 */
import { useState, useRef } from 'react';
import { Button } from './button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

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
  const [preview, setPreview] = useState<string | null>(previewUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className={`w-full ${className}`}>
      <div className="flex flex-col items-center">
        {preview ? (
          <div className="relative w-full">
            <div className="relative rounded-lg overflow-hidden border border-gray-200 w-full aspect-video flex items-center justify-center">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 w-full flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={handleBrowseClick}
          >
            <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500 mb-2">Drag and drop an image here or</p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleBrowseClick}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {label}
            </Button>
          </div>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
          disabled={isUploading}
        />
      </div>
    </div>
  );
} 
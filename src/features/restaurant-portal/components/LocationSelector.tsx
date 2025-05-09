import { useRestaurantLocation } from '../context/RestaurantLocationContext';
import { MapPin, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function LocationSelector() {
  const { locations, selectedLocation, setSelectedLocationById, isLoading, error } = useRestaurantLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="py-3 px-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-400">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="text-sm">Loading locations...</span>
          </div>
        </div>
      </div>
    );
  }

  // Only show 'No locations available' if there was an error and locations is empty
  console.log('locations', locations);
  if ((error || !selectedLocation) && locations.length != 0) {
    return (
      <div className="py-3 px-4 border-b border-gray-200">
        <div className="flex items-center text-red-500">
          <MapPin className="h-4 w-4 mr-2" />
          <span className="text-sm">No locations available</span>
        </div>
      </div>
    );
  }

  // If there are no locations but no error, render nothing
  if (locations.length === 0) {
    return null;
  }

  return (
    <div className="py-3 px-4 border-b border-gray-200 relative" ref={dropdownRef}>
      <button
        className="w-full flex items-center justify-between hover:bg-gray-50 py-1 px-2 rounded-md"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={!selectedLocation}
      >
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-2 text-blue-500" />
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 truncate">
              {selectedLocation ? selectedLocation.name : ''}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {selectedLocation ? `${selectedLocation.city}, ${selectedLocation.state}` : ''}
            </p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && locations.length > 1 && selectedLocation && (
        <div className="absolute left-0 right-0 z-10 mt-2 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {locations.map((location) => (
            <button
              key={location.id}
              className={`block w-full text-left px-4 py-2 hover:bg-gray-50 ${
                selectedLocation && location.id === selectedLocation?.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
              onClick={() => {
                setSelectedLocationById(location.id);
                setIsDropdownOpen(false);
              }}
            >
              <p className="text-sm font-medium truncate">{location.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {location.city}, {location.state}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 
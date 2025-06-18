import { Clock, X } from 'lucide-react';
import { BusinessHours, getRestaurantStatusMessageFromHours } from '@/utils/business-hours';

interface RestaurantStatusProps {
  timezone: string;
  businessHours: BusinessHours[];
  className?: string;
}

export function RestaurantStatus({ timezone, businessHours, className = '' }: RestaurantStatusProps) {
  const status = getRestaurantStatusMessageFromHours(timezone, businessHours);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {status.isOpen ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <Clock className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">{status.message}</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <X className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium text-red-700">{status.message}</span>
        </>
      )}
    </div>
  );
} 
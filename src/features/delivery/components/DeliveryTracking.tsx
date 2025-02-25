import { useState, useEffect } from 'react';
import { getOrder, cancelOrder } from '@/lib/services/nashService';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DeliveryTrackingProps {
  deliveryId: string;
  onCancel?: () => void;
}

interface DeliveryStatus {
  status: string;
  provider: string;
  fee: number;
  estimated_pickup_time: string;
  estimated_delivery_time: string;
  tracking_url?: string;
  driver?: {
    name: string;
    phone: string;
    photo_url?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  dropoff: {
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      instructions?: string;
    };
  };
  tip_amount?: number;
}

export function DeliveryTracking({ deliveryId, onCancel }: DeliveryTrackingProps) {
  const [delivery, setDelivery] = useState<DeliveryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();

  // Fetch delivery status
  useEffect(() => {
    let isMounted = true;
    
    const fetchDeliveryStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get order details from Nash
        const orderResponse = await getOrder(deliveryId);
        
        // For demo purposes, convert the Nash order response to our internal format
        // In a real app, you would use the Nash response directly
        if (isMounted) {
          // Mock delivery status for development
          if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DELIVERY !== 'false') {
            const mockDelivery: DeliveryStatus = {
              status: 'ACTIVE',
              provider: 'Nash Delivery',
              fee: 3.99,
              estimated_pickup_time: new Date(Date.now() + 10 * 60000).toISOString(),
              estimated_delivery_time: new Date(Date.now() + 30 * 60000).toISOString(),
              tracking_url: 'https://example.com/track/mock',
              driver: {
                name: 'John Driver',
                phone: '555-123-4567',
                photo_url: 'https://randomuser.me/api/portraits/men/32.jpg'
              },
              dropoff: {
                address: {
                  street: '123 Main St',
                  city: 'Anytown',
                  state: 'CA',
                  zip: '12345',
                  instructions: 'Leave at door'
                }
              }
            };
            setDelivery(mockDelivery);
          } else {
            // Convert Nash order response to our internal format
            // This is a simplified example - you would need to adapt this to your actual Nash response
            const deliveryStatus: DeliveryStatus = {
              status: orderResponse.status,
              provider: orderResponse.delivery?.type || 'Nash Delivery',
              fee: orderResponse.winnerQuote?.price_cents ? orderResponse.winnerQuote.price_cents / 100 : 0,
              estimated_pickup_time: new Date(Date.now() + 10 * 60000).toISOString(), // Placeholder
              estimated_delivery_time: new Date(Date.now() + 30 * 60000).toISOString(), // Placeholder
              tracking_url: orderResponse.publicTrackingUrl,
              dropoff: {
                address: {
                  street: orderResponse.dropoffAddress.split(',')[0] || '',
                  city: orderResponse.dropoffAddress.split(',')[1]?.trim() || '',
                  state: orderResponse.dropoffAddress.split(',')[2]?.split(' ')[1]?.trim() || '',
                  zip: orderResponse.dropoffAddress.split(',')[2]?.split(' ')[2]?.trim() || '',
                }
              }
            };
            setDelivery(deliveryStatus);
          }
        }
      } catch (err) {
        console.error('Error fetching delivery status:', err);
        if (isMounted) {
          setError('Failed to load delivery status. Please try again.');
          
          // For demo purposes, set mock data even on error
          if (import.meta.env.DEV) {
            const mockDelivery: DeliveryStatus = {
              status: 'ACTIVE',
              provider: 'Nash Delivery',
              fee: 3.99,
              estimated_pickup_time: new Date(Date.now() + 10 * 60000).toISOString(),
              estimated_delivery_time: new Date(Date.now() + 30 * 60000).toISOString(),
              tracking_url: 'https://example.com/track/mock',
              driver: {
                name: 'John Driver',
                phone: '555-123-4567',
                photo_url: 'https://randomuser.me/api/portraits/men/32.jpg'
              },
              dropoff: {
                address: {
                  street: '123 Main St',
                  city: 'Anytown',
                  state: 'CA',
                  zip: '12345'
                }
              }
            };
            setDelivery(mockDelivery);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchDeliveryStatus();
    
    // Set up polling for status updates
    const intervalId = setInterval(fetchDeliveryStatus, 30000); // Poll every 30 seconds
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [deliveryId]);

  // Handle delivery cancellation
  const handleCancelDelivery = async () => {
    if (!delivery || !deliveryId) return;
    
    if (!window.confirm('Are you sure you want to cancel this delivery?')) {
      return;
    }
    
    setIsCancelling(true);
    
    try {
      await cancelOrder(deliveryId, 'Customer requested cancellation');
      
      toast({
        title: 'Delivery Cancelled',
        description: 'Your delivery has been cancelled successfully.',
      });
      
      if (onCancel) {
        onCancel();
      }
    } catch (err) {
      console.error('Error cancelling delivery:', err);
      toast({
        title: 'Cancellation Failed',
        description: 'Failed to cancel delivery. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{error || 'Failed to load delivery information'}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Retry
        </button>
      </div>
    );
  }

  // Format times
  const estimatedPickupTime = new Date(delivery.estimated_pickup_time);
  const estimatedDeliveryTime = new Date(delivery.estimated_delivery_time);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-lg">Delivery Status</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          delivery.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
          delivery.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
          delivery.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {delivery.status}
        </span>
      </div>

      {/* Estimated Times */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Estimated Pickup</span>
          <span>{format(estimatedPickupTime, 'h:mm a')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Estimated Delivery</span>
          <span className="font-medium">{format(estimatedDeliveryTime, 'h:mm a')}</span>
        </div>
      </div>

      {/* Driver Information */}
      {delivery.driver && (
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h4 className="font-medium mb-2">Driver</h4>
          <div className="flex items-center">
            {delivery.driver.photo_url && (
              <img 
                src={delivery.driver.photo_url} 
                alt={delivery.driver.name}
                className="w-10 h-10 rounded-full mr-3"
              />
            )}
            <div>
              <p className="font-medium">{delivery.driver.name}</p>
              <p className="text-sm text-gray-600">{delivery.driver.phone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Details */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="font-medium mb-2">Delivery Details</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Provider</span>
            <span>{delivery.provider}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery Fee</span>
            <span>${delivery.fee.toFixed(2)}</span>
          </div>
          {delivery.tip_amount && (
            <div className="flex justify-between">
              <span className="text-gray-600">Tip</span>
              <span>${delivery.tip_amount.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Address */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="font-medium mb-2">Delivery Address</h4>
        <p>{delivery.dropoff.address.street}</p>
        <p>
          {delivery.dropoff.address.city}, {delivery.dropoff.address.state}{' '}
          {delivery.dropoff.address.zip}
        </p>
        {delivery.dropoff.address.instructions && (
          <p className="text-sm text-gray-600 mt-1">
            Instructions: {delivery.dropoff.address.instructions}
          </p>
        )}
      </div>

      {/* Tracking Link */}
      {delivery.tracking_url && (
        <div className="mb-4">
          <a
            href={delivery.tracking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3 px-4 border border-primary-700 rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            Track Delivery
          </a>
        </div>
      )}

      {/* Cancel Button */}
      {delivery.status !== 'COMPLETED' && delivery.status !== 'CANCELLED' && onCancel && (
        <button
          onClick={handleCancelDelivery}
          disabled={isCancelling}
          className="block w-full text-center py-3 px-4 border border-red-300 rounded-lg shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Delivery'}
        </button>
      )}
    </div>
  );
} 
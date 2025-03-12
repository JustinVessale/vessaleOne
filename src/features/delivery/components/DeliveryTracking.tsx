import { useState, useEffect } from 'react';
import { getOrder, NashOrderResponse } from '@/lib/services/nashService';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DeliveryTrackingProps {
  deliveryId: string;
  onCancel?: () => void;
}

// Map Nash status to user-friendly status
const statusMap: Record<string, string> = {
  'CREATED': 'Order Created',
  'QUOTES_AVAILABLE': 'Finding Delivery',
  'QUOTE_SELECTED': 'Delivery Confirmed',
  'DISPATCHED': 'Finding Driver',
  'ACTIVE': 'Driver Assigned',
  'PICKUP_ARRIVED': 'Driver at Restaurant',
  'PICKUP_COMPLETE': 'Order Picked Up',
  'DROPOFF_ARRIVED': 'Driver Arrived',
  'DROPOFF_COMPLETE': 'Delivered',
  'CANCELLED': 'Cancelled',
  'FAILED': 'Delivery Failed'
};

export function DeliveryTracking({ deliveryId, onCancel }: DeliveryTrackingProps) {
  const [nashOrder, setNashOrder] = useState<NashOrderResponse | null>(null);
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
        
        if (isMounted) {
          setNashOrder(orderResponse);
        }
      } catch (err) {
        console.error('Error fetching delivery status:', err);
        if (isMounted) {
          setError('Failed to load delivery status. Please try again.');
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
    if (!nashOrder || !deliveryId) return;
    
    if (!window.confirm('Are you sure you want to cancel this delivery?')) {
      return;
    }
    
    setIsCancelling(true);
    
    try {
      await import('@/lib/services/nashService').then(({ cancelOrder }) => 
        cancelOrder(deliveryId, 'Customer requested cancellation')
      );
      
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

  if (error || !nashOrder) {
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

  // Get the user-friendly status
  const displayStatus = statusMap[nashOrder.status] || nashOrder.status;
  
  // Get delivery information
  const deliveryProvider = nashOrder.delivery?.type || 'Nash Delivery';
  const deliveryFee = nashOrder.winnerQuote?.price_cents ? nashOrder.winnerQuote.price_cents / 100 : 0;
  
  // Parse address from Nash response
  const dropoffAddress = {
    street: nashOrder.dropoffAddress.split(',')[0] || '',
    city: nashOrder.dropoffAddress.split(',')[1]?.trim() || '',
    state: nashOrder.dropoffAddress.split(',')[2]?.split(' ')[1]?.trim() || '',
    zip: nashOrder.dropoffAddress.split(',')[2]?.split(' ')[2]?.trim() || '',
  };

  // Determine if the order is in a state that can be cancelled
  const canCancel = !['DROPOFF_COMPLETE', 'CANCELLED', 'FAILED'].includes(nashOrder.status);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-lg">Delivery Status</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          nashOrder.status === 'ACTIVE' || nashOrder.status === 'PICKUP_COMPLETE' ? 'bg-green-100 text-green-800' :
          nashOrder.status === 'CREATED' || nashOrder.status === 'QUOTES_AVAILABLE' ? 'bg-yellow-100 text-yellow-800' :
          nashOrder.status === 'DROPOFF_COMPLETE' ? 'bg-blue-100 text-blue-800' :
          nashOrder.status === 'CANCELLED' || nashOrder.status === 'FAILED' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {displayStatus}
        </span>
      </div>

      {/* Delivery Progress */}
      <div className="mb-6">
        <div className="relative">
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
            <div 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
              style={{ 
                width: 
                  nashOrder.status === 'CREATED' || nashOrder.status === 'QUOTES_AVAILABLE' ? '10%' :
                  nashOrder.status === 'QUOTE_SELECTED' || nashOrder.status === 'DISPATCHED' ? '25%' :
                  nashOrder.status === 'ACTIVE' || nashOrder.status === 'PICKUP_ARRIVED' ? '50%' :
                  nashOrder.status === 'PICKUP_COMPLETE' || nashOrder.status === 'DROPOFF_ARRIVED' ? '75%' :
                  nashOrder.status === 'DROPOFF_COMPLETE' ? '100%' :
                  '0%'
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Driver Information - Will be populated from webhook data */}
      {/* Driver information is not available in the initial Nash response */}
      {/* We'll need to update this component when we implement the webhook handler */}

      {/* Delivery Details */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="font-medium mb-2">Delivery Details</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Provider</span>
            <span>{deliveryProvider}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery Fee</span>
            <span>${deliveryFee.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="font-medium mb-2">Delivery Address</h4>
        <p>{dropoffAddress.street}</p>
        <p>
          {dropoffAddress.city}, {dropoffAddress.state}{' '}
          {dropoffAddress.zip}
        </p>
      </div>

      {/* Tracking Link */}
      {nashOrder.publicTrackingUrl && (
        <div className="mb-4">
          <a 
            href={nashOrder.publicTrackingUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block w-full text-center py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Track Delivery
          </a>
        </div>
      )}

      {/* Cancel Button */}
      {canCancel && (
        <button
          onClick={handleCancelDelivery}
          disabled={isCancelling}
          className="block w-full text-center py-2 bg-white border border-red-500 text-red-500 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Delivery'}
        </button>
      )}
    </div>
  );
} 
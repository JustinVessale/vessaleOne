import { useState, useEffect } from 'react';
import { getOrder, NashOrderResponse } from '@/lib/services/nashService';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../amplify/data/resource';

interface DeliveryTrackingProps {
  deliveryId: string;
  orderId: string; // Add orderId prop to fetch order from database
  onCancel?: () => void;
}

// Map Nash status to user-friendly status
const statusMap: Record<string, string> = {
  'PENDING': 'Order Created',
  'CONFIRMED': 'Finding Driver',
  'PICKING_UP': 'Driver at Restaurant',
  'PICKED_UP': 'Order Picked Up',
  'DELIVERING': 'Driver Arrived',
  'COMPLETED': 'Delivered',
  'CANCELLED': 'Cancelled',
  'FAILED': 'Delivery Failed'
};

export function DeliveryTracking({ deliveryId, orderId, onCancel }: DeliveryTrackingProps) {
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();
  
  // Initialize Amplify client
  const client = generateClient<Schema>();

  // Fetch order from database
  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get order details from database
        const { data: orderData, errors } = await client.models.Order.get({
          id: orderId
        });
        
        if (errors) {
          throw new Error('Failed to fetch order');
        }
        
        if (isMounted && orderData) {
          setOrder(orderData);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        if (isMounted) {
          setError('Failed to load delivery status. Please try again.');
          setIsLoading(false);
        }
      }
    };
    
    // Subscribe to real-time updates
    const setupSubscription = async () => {
      try {
        // Use the onUpdate subscription instead of observeQuery
        subscription = client.models.Order.onCreate({
          filter: { id: { eq: orderId } }
        }).subscribe({
          next: (data) => {
            if (data && isMounted) {
              setOrder(data);
              setIsLoading(false);
            }
          },
          error: (err: Error) => {
            console.error('Subscription error:', err);
            if (isMounted) {
              setError('Failed to receive real-time updates. Please refresh.');
            }
          }
        });
        
        // Also subscribe to updates
        const updateSubscription = client.models.Order.onUpdate({
          filter: { id: { eq: orderId } }
        }).subscribe({
          next: (data) => {
            if (data && isMounted) {
              setOrder(data);
              setIsLoading(false);
            }
          },
          error: (err: Error) => {
            console.error('Update subscription error:', err);
          }
        });
        
        // Combine subscriptions
        const originalUnsubscribe = subscription.unsubscribe;
        subscription.unsubscribe = () => {
          originalUnsubscribe.call(subscription);
          updateSubscription.unsubscribe();
        };
      } catch (err) {
        console.error('Error setting up subscription:', err);
      }
    };
    
    fetchOrder();
    setupSubscription();
    
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [orderId, client.models.Order]);

  // Handle delivery cancellation
  const handleCancelDelivery = async () => {
    if (!order || !deliveryId) return;
    
    if (!window.confirm('Are you sure you want to cancel this delivery?')) {
      return;
    }
    
    setIsCancelling(true);
    
    try {
      await import('@/lib/services/nashService').then(({ cancelOrder }) => 
        cancelOrder(deliveryId, 'Customer requested cancellation')
      );
      
      // Update order status in database
      await client.models.Order.update({
        id: orderId,
        status: 'CANCELLED',
        deliveryInfo: {
          ...order.deliveryInfo,
          status: 'CANCELLED'
        }
      });
      
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

  if (error || !order || !order.deliveryInfo) {
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

  // Get delivery information from the order
  const deliveryInfo = order.deliveryInfo;
  const deliveryStatus = deliveryInfo.status;
  const displayStatus = statusMap[deliveryStatus] || deliveryStatus;
  const deliveryProvider = deliveryInfo.provider || 'Nash Delivery';
  const deliveryFee = deliveryInfo.fee || 0;
  const trackingUrl = deliveryInfo.trackingUrl;
  
  // Parse address from order
  const dropoffAddress = order.deliveryAddress || '';
  const addressParts = dropoffAddress.split(',');
  const formattedAddress = {
    street: addressParts[0] || '',
    city: addressParts[1]?.trim() || '',
    state: addressParts[2]?.split(' ')[0]?.trim() || '',
    zip: addressParts[2]?.split(' ')[1]?.trim() || '',
  };

  // Determine if the order is in a state that can be cancelled
  const canCancel = !['COMPLETED', 'CANCELLED', 'FAILED'].includes(deliveryStatus);

  // Get driver information if available
  const driver = order.driver;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-lg">Delivery Status</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          deliveryStatus === 'PICKING_UP' || deliveryStatus === 'PICKED_UP' ? 'bg-green-100 text-green-800' :
          deliveryStatus === 'PENDING' || deliveryStatus === 'CONFIRMED' ? 'bg-yellow-100 text-yellow-800' :
          deliveryStatus === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
          deliveryStatus === 'CANCELLED' || deliveryStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
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
                  deliveryStatus === 'PENDING' ? '10%' :
                  deliveryStatus === 'CONFIRMED' ? '25%' :
                  deliveryStatus === 'PICKING_UP' ? '50%' :
                  deliveryStatus === 'PICKED_UP' ? '75%' :
                  deliveryStatus === 'DELIVERING' ? '90%' :
                  deliveryStatus === 'COMPLETED' ? '100%' :
                  '0%'
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Driver Information */}
      {driver && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Driver Information</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Name</span>
              <span>{driver.name}</span>
            </div>
            {driver.phone && (
              <div className="flex justify-between">
                <span className="text-gray-600">Phone</span>
                <a href={`tel:${driver.phone}`} className="text-blue-500">{driver.phone}</a>
              </div>
            )}
          </div>
        </div>
      )}

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
          {deliveryInfo.estimatedDeliveryTime && (
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Delivery</span>
              <span>{new Date(deliveryInfo.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Address */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="font-medium mb-2">Delivery Address</h4>
        <p>{formattedAddress.street}</p>
        <p>
          {formattedAddress.city}, {formattedAddress.state}{' '}
          {formattedAddress.zip}
        </p>
      </div>

      {/* Tracking Link */}
      {trackingUrl && (
        <div className="mb-4">
          <a 
            href={trackingUrl} 
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
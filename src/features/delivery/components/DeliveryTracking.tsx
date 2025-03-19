import { useState, useEffect, useRef } from 'react';
import { getOrder } from '@/lib/services/nashService';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';

interface DeliveryTrackingProps {
  deliveryId?: string;
  orderId: string;
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

const client = generateClient<Schema>();

export function DeliveryTracking({ deliveryId, orderId, onCancel }: DeliveryTrackingProps) {
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isFetchingRef = useRef(false);
  const { toast } = useToast();
  
  const fetchOrder = async () => {
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setHasError(false);
      
      // Fetch order from database with a specific selection set
      const { data: orderData, errors } = await client.models.Order.get(
        { id: orderId },
        { 
          selectionSet: [
            'id', 
            'status',
            'deliveryInfo.status',
            'deliveryInfo.estimatedDeliveryTime',
            'deliveryInfo.trackingUrl',
            'driver.name',
            'driver.phone',
            'driver.currentLocation.lat',
            'driver.currentLocation.lng'
          ] 
        }
      );
      
      if (errors) {
        console.error("GraphQL errors:", errors);
        throw new Error("Failed to fetch order data");
      }
      
      if (orderData) {
        setOrder(orderData);
        setRetryCount(0); // Reset retry count on success
      } else {
        // Increment retry count if order not found
        setRetryCount(prev => prev + 1);
        if (retryCount >= 2) {
          setHasError(true);
          toast({
            title: "Error",
            description: "Unable to fetch delivery status after multiple attempts.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      // Increment retry count on error
      setRetryCount(prev => prev + 1);
      if (retryCount >= 2) {
        setHasError(true);
        toast({
          title: "Error",
          description: "Unable to fetch delivery status. Please try again later.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Initial fetch only - no polling since we're using webhooks now
  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Set up subscription to order updates
  useEffect(() => {
    if (!orderId) return;

    // This will be updated by the webhook through database updates
    // No need to poll as the webhook will update the database in real-time
    
    // We could add a subscription here in the future if needed
    // For now, we rely on manual refresh if the user wants the latest data
    
  }, [orderId]);

  const handleCancelDelivery = async () => {
    if (!onCancel) {
      return;
    }
    
    try {
      onCancel();
      toast({
        title: 'Delivery Cancelled',
        description: 'Your delivery has been cancelled successfully.',
      });
    } catch (error) {
      console.error('Error cancelling delivery:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel delivery. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    setRetryCount(0); // Reset retry count on manual refresh
    fetchOrder();
  };

  if (isLoading && !order) {
    return <div className="flex justify-center items-center p-8">Loading delivery status...</div>;
  }

  if (hasError) {
    return (
      <div className="flex flex-col justify-center items-center p-8">
        <p className="text-red-500 mb-4">Unable to load delivery status</p>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!order || !order.deliveryInfo) {
    return <div className="p-4">No delivery information available</div>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Delivery Status: {statusMap[order.deliveryInfo.status] || order.deliveryInfo.status}</h3>
      
      {order.deliveryInfo.estimatedDeliveryTime && (
        <p className="mb-2">
          Estimated delivery: {format(new Date(order.deliveryInfo.estimatedDeliveryTime), 'h:mm a')}
        </p>
      )}
      
      {/* Nash Portal URL */}
      {order.deliveryInfo.trackingUrl && (
        <div className="mb-4">
          <a 
            href={order.deliveryInfo.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Track Delivery on Nash Portal
          </a>
        </div>
      )}
      
      {order.driver && (
        <div className="mb-4">
          <p className="font-medium">Courier Information</p>
          <p>{order.driver.name}</p>
          <p>{order.driver.phone}</p>
        </div>
      )}
      
      {order.driver?.currentLocation && (
        <div className="mb-4">
          <p className="font-medium">Current Location</p>
          <p>
            {order.driver.currentLocation.lat}, {order.driver.currentLocation.lng}
          </p>
        </div>
      )}
      
      <button 
        onClick={handleRefresh}
        className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm mt-2"
      >
        Refresh Status
      </button>
      
      {onCancel && (
        <button
          onClick={handleCancelDelivery}
          className="block w-full text-center py-2 bg-white border border-red-500 text-red-500 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          Cancel Delivery
        </button>
      )}
    </div>
  );
}
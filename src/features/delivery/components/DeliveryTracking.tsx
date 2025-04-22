import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';

interface DeliveryTrackingProps {
  orderId: string;
  onCancel?: () => void;
  onSwitchToPickup?: () => Promise<void>;
}

// Map Nash status to user-friendly status
const statusMap: Record<string, string> = {
  'PENDING': 'Order Created',
  'CONFIRMED': 'Driver Assigned',
  'PICKING_UP': 'Driver at Restaurant',
  'PICKED_UP': 'Order Picked Up',
  'DELIVERING': 'Driver Arrived',
  'COMPLETED': 'Delivered',
  'CANCELLED': 'Cancelled',
  'FAILED': 'Delivery Failed'
};

const client = generateClient<Schema>();

type OrderType = Schema['Order']['type'];

export function DeliveryTracking({ orderId, onCancel, onSwitchToPickup }: DeliveryTrackingProps) {
  const [order, setOrder] = useState<OrderType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isSwitchingToPickup, setIsSwitchingToPickup] = useState(false);
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
            'driver.currentLocation.lng',
            'locationId',
            'location.id',
            'location.name'
          ] 
        }
      );
      
      if (errors) {
        console.error("GraphQL errors:", errors);
        throw new Error("Failed to fetch order data");
      }
      
      if (orderData) {
        setOrder(orderData as any as OrderType);
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

    const sub = client.models.Order.onUpdate({
      filter: { id: { eq: orderId } }
    }).subscribe({
      next: (event: any) => {
        const updatedOrder = event.data;
        if (updatedOrder) {
          setOrder(updatedOrder as OrderType);
          if (updatedOrder.deliveryInfo?.status) {
            toast({
              title: "Delivery Status Updated",
              description: `Status: ${statusMap[updatedOrder.deliveryInfo.status] || updatedOrder.deliveryInfo.status}`,
              variant: "default",
            });
          }
        }
      },
      error: (error) => {
        console.error('Subscription error:', error);
        toast({
          title: "Error",
          description: "Failed to receive delivery updates",
          variant: "destructive",
        });
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [orderId, toast]);

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

  const handleSwitchToPickup = async () => {
    if (!onSwitchToPickup || !order) return;
    
    setIsSwitchingToPickup(true);
    try {
      // Update order to remove delivery info and set status to PAID
      await client.models.Order.update({
        id: order.id,
        isDelivery: false,
        deliveryInfo: null,
        deliveryFee: 0,
        deliveryAddress: '',
        status: 'PAID', // Keep as PAID so restaurant can accept it
        updatedAt: new Date().toISOString()
      });

      await onSwitchToPickup();
      
      toast({
        title: "Order Updated",
        description: "Successfully switched to pickup. Restaurant will need to accept this order.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error switching to pickup:', error);
      toast({
        title: "Error",
        description: "Failed to switch to pickup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSwitchingToPickup(false);
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

  if (!order?.deliveryInfo?.status) {
    return <div className="p-4">No delivery information available</div>;
  }

  const deliveryStatus = order.deliveryInfo.status;
  const isDeliveryFailed = deliveryStatus === 'CANCELLED' || deliveryStatus === 'FAILED';
  const canCancel = !['CANCELLED', 'FAILED', 'COMPLETED'].includes(deliveryStatus);

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">
        Delivery Status: {statusMap[deliveryStatus] || deliveryStatus}
      </h3>
      
      {order.deliveryInfo.estimatedDeliveryTime && (
        <p className="mb-2">
          Estimated delivery: {format(new Date(order.deliveryInfo.estimatedDeliveryTime), 'h:mm a')}
        </p>
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

      {/* Show switch to pickup option if delivery failed or was cancelled */}
      {onSwitchToPickup && isDeliveryFailed && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 mb-2">
            Delivery {deliveryStatus.toLowerCase()}. Would you like to switch to pickup instead?
          </p>
          <button
            onClick={handleSwitchToPickup}
            disabled={isSwitchingToPickup}
            className="w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSwitchingToPickup ? 'Switching to Pickup...' : 'Switch to Pickup'}
          </button>
        </div>
      )}
      
      <button 
        onClick={handleRefresh}
        className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm mt-2"
      >
        Refresh Status
      </button>
      
      {onCancel && canCancel && (
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
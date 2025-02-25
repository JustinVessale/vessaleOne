import { useState, useEffect } from 'react';
import { NashDeliveryResponse } from '@/lib/services/nashService';
import { format } from 'date-fns';
import { useDelivery } from '../hooks/useDelivery';

interface DeliveryTrackingProps {
  deliveryId: string;
  onCancel?: () => void;
}

export function DeliveryTracking({ deliveryId, onCancel }: DeliveryTrackingProps) {
  const { 
    delivery, 
    isLoading, 
    error, 
    fetchDelivery, 
    cancelDelivery, 
    isCancelling 
  } = useDelivery();
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // Fetch delivery details on mount and set up polling
  useEffect(() => {
    const loadDelivery = async () => {
      try {
        await fetchDelivery(deliveryId);
      } catch (error) {
        console.error('Error fetching delivery:', error);
      }
    };

    loadDelivery();

    // Set up polling every 30 seconds
    const intervalId = window.setInterval(loadDelivery, 30000);
    setRefreshInterval(intervalId);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [deliveryId, fetchDelivery]);

  // Clear polling when delivery reaches a terminal state
  useEffect(() => {
    const terminalStates = ['COMPLETED', 'CANCELLED', 'FAILED'];
    
    if (delivery && terminalStates.includes(delivery.status) && refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [delivery, refreshInterval]);

  const handleCancelDelivery = async () => {
    try {
      await cancelDelivery('Customer requested cancellation');
      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      console.error('Error cancelling delivery:', error);
    }
  };

  if (isLoading && !delivery) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <h3 className="text-red-800 font-medium">Error Loading Delivery</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => fetchDelivery(deliveryId)}
          className="mt-2 text-red-700 hover:text-red-800 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="bg-yellow-50 p-4 rounded-md">
        <h3 className="text-yellow-800 font-medium">Delivery Not Found</h3>
        <p className="text-yellow-700">The delivery information could not be found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-medium text-lg">Delivery Status</h3>
          <p className="text-gray-600">Order #{delivery.external_id || delivery.id.slice(-6)}</p>
        </div>
        <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          {delivery.status}
        </div>
      </div>

      {/* Delivery Timeline */}
      <div className="space-y-4 mb-6">
        <div className="flex items-start">
          <div className="flex flex-col items-center mr-4">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="h-full w-0.5 bg-gray-300 mt-2"></div>
          </div>
          <div>
            <h4 className="font-medium">Order Confirmed</h4>
            <p className="text-sm text-gray-600">
              {format(new Date(delivery.estimated_pickup_time), 'MMM d, h:mm a')}
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <div className="flex flex-col items-center mr-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
              delivery.status === 'PICKING_UP' || delivery.status === 'PICKED_UP' || delivery.status === 'COMPLETED'
                ? 'bg-green-500'
                : 'bg-gray-300'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            </div>
            <div className="h-full w-0.5 bg-gray-300 mt-2"></div>
          </div>
          <div>
            <h4 className="font-medium">Preparing Your Order</h4>
            <p className="text-sm text-gray-600">
              {delivery.pickup.actual_timestamp 
                ? `Picked up at ${format(new Date(delivery.pickup.actual_timestamp), 'h:mm a')}`
                : `Estimated pickup at ${format(new Date(delivery.estimated_pickup_time), 'h:mm a')}`}
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <div className="flex flex-col items-center mr-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
              delivery.status === 'COMPLETED'
                ? 'bg-green-500'
                : 'bg-gray-300'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75zM3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
              </svg>
            </div>
          </div>
          <div>
            <h4 className="font-medium">Delivery</h4>
            <p className="text-sm text-gray-600">
              {delivery.dropoff.actual_timestamp 
                ? `Delivered at ${format(new Date(delivery.dropoff.actual_timestamp), 'h:mm a')}`
                : `Estimated delivery by ${format(new Date(delivery.estimated_dropoff_time), 'h:mm a')}`}
            </p>
          </div>
        </div>
      </div>

      {/* Driver Information */}
      {delivery.driver && (
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h4 className="font-medium mb-2">Driver Information</h4>
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
            className="block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Track Delivery
          </a>
        </div>
      )}

      {/* Cancel Button */}
      {delivery.status !== 'COMPLETED' && 
       delivery.status !== 'CANCELLED' && 
       delivery.status !== 'FAILED' && (
        <button
          onClick={handleCancelDelivery}
          disabled={isCancelling}
          className="w-full text-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Delivery'}
        </button>
      )}
    </div>
  );
} 
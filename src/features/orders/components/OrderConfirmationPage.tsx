import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';
import { DeliveryTracking } from '@/features/delivery/components/DeliveryTracking';

const client = generateClient<Schema>();


export function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, errors } = await client.models.Order.get(
        { id: orderId! },
        {
          selectionSet: [
            'id', 
            'status', 
            'total', 
            'createdAt', 
            'items.*', 
            'items.menuItem.*',
            'isDelivery',
            'deliveryFee',
            'deliveryAddress',
            'customerName',
            'customerPhone',
            'deliveryInfo.*',
            'locationId',
            'location.name',
            'location.address',
            'location.city',
            'location.state',
            'location.zip',
            'location.phoneNumber',
            'restaurantId',
            'restaurant.name',
            'restaurant.address',
            'restaurant.city',
            'restaurant.state',
            'restaurant.zip',
            'restaurant.phone'
          ]
        }
      )


      if (errors || !data) throw new Error('Failed to fetch order');
      return data;
    },
    enabled: !!orderId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-600">We couldn't find the order you're looking for.</p>
        </div>
      </div>
    );
  }

  // Get restaurant info from either location or restaurant property
  const restaurantName = order.location?.name || order.restaurant?.name || 'Restaurant';
  const restaurantAddress = order.location ? 
    `${order.location.address}, ${order.location.city}, ${order.location.state} ${order.location.zip}` : 
    order.restaurant ? 
    `${order.restaurant.address}, ${order.restaurant.city}, ${order.restaurant.state} ${order.restaurant.zip}` :
    '';
  const restaurantPhone = order.location?.phoneNumber || order.restaurant?.phone || '';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Order Confirmed!
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Thank you for your order. We'll notify you when it's ready.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            {/* Order ID and Date */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Order #{order.id.slice(-6)}
              </h2>
              <p className="text-sm text-gray-600">
                Placed on {format(new Date(order.createdAt ?? Date.now()), 'MMM d, yyyy h:mm a')}
              </p>
            </div>

            {/* Restaurant Information */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{restaurantName}</h3>
              {restaurantAddress && <p className="text-sm text-gray-600">{restaurantAddress}</p>}
              {restaurantPhone && <p className="text-sm text-gray-600">{restaurantPhone}</p>}
              {order.location && order.restaurant?.name && (
                <p className="text-sm text-gray-600 mt-1">Part of {order.restaurant.name}</p>
              )}
            </div>

            {/* Delivery Information (if applicable) */}
            {order.isDelivery && (
              <div className="mb-6 border-b border-gray-200 pb-6">
                
                {order.deliveryInfo?.deliveryId ? (
                  <DeliveryTracking 
                    orderId={order.id} 
                  />
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      <span className="font-medium">Delivery Address:</span> {order.deliveryAddress}
                    </p>
                    {order.customerName && (
                      <p className="text-gray-700">
                        <span className="font-medium">Recipient:</span> {order.customerName}
                      </p>
                    )}
                    {order.customerPhone && (
                      <p className="text-gray-700">
                        <span className="font-medium">Phone:</span> {order.customerPhone}
                      </p>
                    )}
                    {order.deliveryInfo?.estimatedDeliveryTime && (
                      <p className="text-gray-700">
                        <span className="font-medium">Estimated Delivery:</span> {
                          format(new Date(order.deliveryInfo.estimatedDeliveryTime), 'MMM d, h:mm a')
                        }
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Order Items */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <div>
                      <span className="font-medium">{item.quantity}x </span>
                      {item.menuItem?.name}
                      {item.specialInstructions && (
                        <p className="text-sm text-gray-600 mt-1">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    <div className="text-gray-900">
                      {formatCurrency(item.menuItem?.price ?? 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-gray-200 mt-6 pt-6">
              {/* Subtotal */}
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>{formatCurrency((order.total ?? 0) - (order.deliveryFee ?? 0))}</span>
              </div>
              
              {/* Delivery Fee (if applicable) */}
              {order.isDelivery && order.deliveryFee && (
                <div className="flex justify-between text-gray-700 mt-2">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              
              {/* Total */}
              <div className="flex justify-between text-lg font-medium mt-2 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{formatCurrency(order.total ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">Need Help?</h3>
          <p className="mt-2 text-gray-600">
            If you have any questions about your order, please contact the restaurant.
          </p>
        </div>
      </div>
    </div>
  );
} 
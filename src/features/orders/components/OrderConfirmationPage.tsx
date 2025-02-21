import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';

const client = generateClient<Schema>();

type Order = Schema['Order']['type'];
type OrderStatus = NonNullable<Order['status']>;

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAYMENT_PROCESSING: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

export function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, errors } = await client.models.Order.get(
        { id: orderId! },
        {
          selectionSet: ['id', 'status', 'total', 'createdAt', 'items.*', 'items.menuItem.*']
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

            {/* Status Badge */}
            <div className="mb-6">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${order.status ? statusColors[order.status] : ''}`}>
                {order.status || 'UNKNOWN'}
              </span>
            </div>

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
              <div className="flex justify-between text-lg font-medium">
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
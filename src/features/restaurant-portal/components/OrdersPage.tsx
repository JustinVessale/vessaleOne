import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useSelectedLocation } from '../hooks/useSelectedLocation';

const client = generateClient<Schema>();


// Order status badge component
function OrderStatusBadge({ status }: { status: string }) {
  const getStatusStyles = () => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PREPARING':
      case 'RESTAURANT_ACCEPTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'PAID':
      case 'PENDING':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'RESTAURANT_ACCEPTED':
        return 'Accepted';
      default:
        return status;
    }
  };

  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles()}`}>
      {getStatusLabel()}
    </span>
  );
}

// Order Table Component
function OrderTable({ 
  title, 
  orders, 
  processingOrder, 
  updateOrderStatus, 
  expandedOrder, 
  toggleOrderExpand 
}: { 
  title: string; 
  orders: any[]; 
  processingOrder: string | null; 
  updateOrderStatus: (orderId: string, newStatus: string) => Promise<void>; 
  expandedOrder: string | null; 
  toggleOrderExpand: (orderId: string) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div className="text-center py-6 text-gray-500">
          No orders in this section.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer & Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <React.Fragment key={order.id}>
                <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleOrderExpand(order.id)}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">{order.id.slice(-5)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    <div>{order.customerName || 'Guest'}{order.location?.name ? ` (${order.location.name})` : ''}</div>
                    <div className="text-xs text-gray-400">{format(new Date(order.createdAt), 'MMM d, h:mm a')}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">${order.total?.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {order.status === 'PAID' && (
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOrderStatus(order.id, 'RESTAURANT_ACCEPTED');
                        }}
                        disabled={processingOrder === order.id}
                      >
                        {processingOrder === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Accept
                      </Button>
                    )}
                    {order.status === 'RESTAURANT_ACCEPTED' && (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOrderStatus(order.id, 'PREPARING');
                        }}
                        disabled={processingOrder === order.id}
                      >
                        {processingOrder === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <span>Start Preparing</span>
                        )}
                      </Button>
                    )}
                    {order.status === 'PREPARING' && (
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOrderStatus(order.id, 'READY');
                        }}
                        disabled={processingOrder === order.id}
                      >
                        {processingOrder === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <>
                            <Printer className="h-4 w-4 mr-1" />
                            Mark Ready
                          </>
                        )}
                      </Button>
                    )}
                    {order.status === 'READY' && (
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOrderStatus(order.id, 'COMPLETED');
                        }}
                        disabled={processingOrder === order.id}
                      >
                        {processingOrder === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <span>Complete</span>
                        )}
                      </Button>
                    )}
                    {expandedOrder === order.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400 inline ml-2" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400 inline ml-2" />
                    )}
                  </td>
                </tr>
                {expandedOrder === order.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="text-sm">
                        <h3 className="font-medium mb-2">Order Items</h3>
                        <div className="border rounded-md overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Price</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {order.items?.map((item: any, index: number) => (
                                <tr key={index}>
                                  <td className="px-4 py-2 text-sm">{item.menuItem?.name || 'Unknown Item'}</td>
                                  <td className="px-4 py-2 text-sm">{item.quantity}</td>
                                  <td className="px-4 py-2 text-sm">${item.menuItem?.price?.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 flex justify-between">
                          <div className="space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                printOrderReceipt(order);
                              }}
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              Print Receipt
                            </Button>
                          </div>
                          {order.status !== 'CANCELLED' && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateOrderStatus(order.id, 'CANCELLED');
                              }}
                              disabled={processingOrder === order.id}
                            >
                              Cancel Order
                            </Button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const printOrderReceipt = (order: any) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this website to print receipts');
    return;
  }

  // Format order date
  const orderDate = format(new Date(order.createdAt), 'MMM d, yyyy h:mm a');

  // Construct HTML content for the receipt
  const receiptContent = `
    <html>
      <head>
        <title>Order Receipt #${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
          .receipt { max-width: 300px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 15px; }
          .order-info { margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
          .order-items { margin-bottom: 15px; }
          .item-row { margin-bottom: 5px; }
          .totals { margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px; }
          .centered { text-align: center; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; }
          .text-right { text-align: right; }
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h2>Order Receipt</h2>
          </div>
          
          <div class="order-info">
            <p><strong>Order #:</strong> ${order.id}</p>
            <p><strong>Date:</strong> ${orderDate}</p>
            <p><strong>Customer:</strong> ${order.customerName || 'Guest'}</p>
          </div>
          
          <div class="order-items">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th class="text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                ${order.items?.map((item: any) => `
                  <tr>
                    <td>${item.menuItem?.name || 'Unknown Item'}</td>
                    <td>${item.quantity}</td>
                    <td class="text-right">$${(item.quantity * (item.menuItem?.price || 0)).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="totals">
            <p><strong>Total:</strong> $${order.total?.toFixed(2)}</p>
          </div>
          
          <div class="centered">
            <p>Thank you for your order!</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  // Write the content to the new window and trigger print
  printWindow.document.open();
  printWindow.document.write(receiptContent);
  printWindow.document.close();
};

export function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery] = useState('');
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const { locationId, locationName, hasLocation } = useSelectedLocation();

  useEffect(() => {
    fetchOrders();
  }, [locationId]); // Refetch when location changes

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const restaurantId = sessionStorage.getItem('restaurantId');
      
      if (!restaurantId) {
        console.error('No restaurant ID found in session storage');
        setIsLoading(false);
        return;
      }

      let filter: any = {
        restaurantId: { eq: restaurantId }
      };

      // Add location filter if a location is selected
      if (locationId) {
        filter.locationId = { eq: locationId };
      }

      // Fetch orders for the restaurant and location
      const { data, errors } = await client.models.Order.list ({
        filter,
        selectionSet: [
          'id', 
          'customerName', 
          'status', 
          'total', 
          'createdAt', 
          'items.quantity', 
          'items.menuItem.name', 
          'items.menuItem.price', 
          'locationId',
          'location.name'
        ],
      });

      if (errors) {
        console.error('Errors fetching orders:', errors);
      }

      if (data) {
        console.log('Orders fetched:', data);
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setProcessingOrder(orderId);
    try {
      await client.models.Order.update({
        id: orderId,
        status: newStatus as "PENDING" | "COMPLETED" | "CANCELLED" | "PAYMENT_PROCESSING" | "PAID" | "RESTAURANT_ACCEPTED" | "PREPARING" | "READY",
      });

      // Update local state after successful update
      setOrders((prevOrders) => 
        prevOrders.map((order) => 
          order.id === orderId 
            ? { ...order, status: newStatus } 
            : order
        )
      );

      // If the status is 'READY', simulate sending to printer
      if (newStatus === 'READY') {
        await sendToPrinter(orderId);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setProcessingOrder(null);
    }
  };

  const sendToPrinter = async (orderId: string) => {
    // In a real implementation, this would connect to your printer service
    const order = orders.find(o => o.id === orderId);
    if (order) {
      try {
        console.log(`Sending order ${orderId} to printer`);
        // Simulating printer delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // You could call the print function here automatically
        // printOrderReceipt(order);
        
        return true;
      } catch (error) {
        console.error('Error printing order:', error);
        return false;
      }
    }
    return false;
  };

  const toggleOrderExpand = (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };

  // Filter orders by status
  const getOrdersByStatus = (status: string | string[]) => {
    const statusArray = Array.isArray(status) ? status : [status];
    return orders
      .filter(order => statusArray.includes(order.status))
      .filter(order => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          (order.id && order.id.toLowerCase().includes(query)) ||
          (order.customerName && order.customerName.toLowerCase().includes(query)) ||
          (order.customerEmail && order.customerEmail.toLowerCase().includes(query))
        );
      });
  };

  // Get different order categories
  const newOrders = getOrdersByStatus(['PAID']);
  const inProgressOrders = getOrdersByStatus(['RESTAURANT_ACCEPTED', 'PREPARING']);
  const readyOrders = getOrdersByStatus(['READY']);
  const completedOrders = getOrdersByStatus(['COMPLETED', 'CANCELLED']);

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            {hasLocation && locationName && (
              <p className="text-gray-600 mt-1">Managing orders for location: {locationName}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchOrders}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading orders...</span>
        </div>
      ) : (
        <>
          <OrderTable 
            title="New Orders" 
            orders={newOrders} 
            processingOrder={processingOrder}
            updateOrderStatus={updateOrderStatus}
            expandedOrder={expandedOrder}
            toggleOrderExpand={toggleOrderExpand}
          />
          
          <OrderTable 
            title="In Progress" 
            orders={inProgressOrders} 
            processingOrder={processingOrder}
            updateOrderStatus={updateOrderStatus}
            expandedOrder={expandedOrder}
            toggleOrderExpand={toggleOrderExpand}
          />
          
          <OrderTable 
            title="Ready for Pickup/Delivery" 
            orders={readyOrders} 
            processingOrder={processingOrder}
            updateOrderStatus={updateOrderStatus}
            expandedOrder={expandedOrder}
            toggleOrderExpand={toggleOrderExpand}
          />
          
          <OrderTable 
            title="Completed Orders" 
            orders={completedOrders} 
            processingOrder={processingOrder}
            updateOrderStatus={updateOrderStatus}
            expandedOrder={expandedOrder}
            toggleOrderExpand={toggleOrderExpand}
          />
        </>
      )}
    </div>
  );
} 
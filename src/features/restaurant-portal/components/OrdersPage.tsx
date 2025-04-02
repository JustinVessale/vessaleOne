import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, Search, ChevronDown, ChevronUp, Check } from 'lucide-react';

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <React.Fragment key={order.id}>
                <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleOrderExpand(order.id)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{order.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{order.customerName || 'Guest'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{format(new Date(order.createdAt), 'MMM d, h:mm a')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">${order.total?.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.status === 'PAID' && (
                      <Button 
                        className="bg-green-600 hover:bg-green-700" 
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
                        className="bg-yellow-600 hover:bg-yellow-700" 
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
                        className="bg-green-500 hover:bg-green-600" 
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
                        className="bg-gray-500 hover:bg-gray-600" 
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
                    <td colSpan={6} className="px-6 py-4">
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
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const restaurantId = sessionStorage.getItem('restaurantId');
        console.log("About to fetch orders for restaurantId:", restaurantId);
        if (!restaurantId) return;

        const { data } = await client.models.Order.list({
          filter: {
            restaurantId: { eq: restaurantId },
          },
          selectionSet: ['id', 'customerName', 'status', 'total', 'createdAt', 'items.quantity', 'items.menuItem.name', 'items.menuItem.price'],
        });

        console.log("Fetched orders:", data);

        // Sort the data by createdAt in descending order after fetching
        const sortedData = [...data].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
          return dateB.getTime() - dateA.getTime();
        });
        
        setOrders(sortedData);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
    
    // Set up polling for new orders (every 30 seconds)
    const intervalId = setInterval(fetchOrders, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

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

  // Filter orders by search term and organize by status
  const filteredOrders = orders.filter(order => {
    return order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Group orders by status
  const incomingOrders = filteredOrders.filter(order => order.status === 'PAID');
  const inProgressOrders = filteredOrders.filter(order => 
    order.status === 'RESTAURANT_ACCEPTED' || 
    order.status === 'PREPARING' || 
    order.status === 'READY'
  );
  const completedOrders = filteredOrders.filter(order => order.status === 'COMPLETED');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600 mt-1">Manage your restaurant orders</p>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Incoming Orders */}
      <OrderTable 
        title="Incoming Orders" 
        orders={incomingOrders}
        processingOrder={processingOrder}
        updateOrderStatus={updateOrderStatus}
        expandedOrder={expandedOrder}
        toggleOrderExpand={toggleOrderExpand}
      />

      {/* In Progress Orders */}
      <OrderTable 
        title="In Progress Orders" 
        orders={inProgressOrders}
        processingOrder={processingOrder}
        updateOrderStatus={updateOrderStatus}
        expandedOrder={expandedOrder}
        toggleOrderExpand={toggleOrderExpand}
      />

      {/* Completed Orders */}
      <OrderTable 
        title="Completed Orders" 
        orders={completedOrders}
        processingOrder={processingOrder}
        updateOrderStatus={updateOrderStatus}
        expandedOrder={expandedOrder}
        toggleOrderExpand={toggleOrderExpand}
      />
    </div>
  );
} 
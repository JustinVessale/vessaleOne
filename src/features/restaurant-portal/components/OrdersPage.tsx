import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Printer, Loader2, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const client = generateClient<Schema>();

// Order status badge component
function OrderStatusBadge({ status }: { status: string }) {
  const getStatusStyles = () => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'new':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles()}`}>
      {status}
    </span>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const restaurantId = sessionStorage.getItem('restaurantId');
        if (!restaurantId) return;

        const { data } = await client.models.Order.list({
          filter: {
            restaurantId: { eq: restaurantId },
          },
          selectionSet: ['id', 'customerName', 'status', 'total', 'createdAt', 'items.quantity', 'items.menuItem.name'],
        });

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
        status: newStatus as "PENDING" | "COMPLETED" | "CANCELLED" | "PAYMENT_PROCESSING" | "PAID" | "PREPARING" | "READY",
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
    console.log(`Sending order ${orderId} to printer`);
    
    // Simulating printer delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return true;
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'PAID':
        return <Badge className="bg-blue-500">Paid</Badge>;
      case 'PREPARING':
        return <Badge className="bg-purple-500">Preparing</Badge>;
      case 'READY':
        return <Badge className="bg-green-500">Ready</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-gray-500">Completed</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getActionButton = (order: any) => {
    const { id, status } = order;
    const isProcessing = processingOrder === id;
    
    if (isProcessing) {
      return (
        <Button disabled className="w-32">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing
        </Button>
      );
    }
    
    switch (status) {
      case 'PENDING':
        return (
          <Button className="bg-blue-500 hover:bg-blue-600 w-32" onClick={() => updateOrderStatus(id, 'PAID')}>
            Accept Order
          </Button>
        );
      case 'PAID':
        return (
          <Button className="bg-purple-500 hover:bg-purple-600 w-32" onClick={() => updateOrderStatus(id, 'PREPARING')}>
            Start Preparing
          </Button>
        );
      case 'PREPARING':
        return (
          <Button className="bg-green-500 hover:bg-green-600 w-32" onClick={() => updateOrderStatus(id, 'READY')}>
            <Printer className="mr-2 h-4 w-4" />
            Mark Ready
          </Button>
        );
      case 'READY':
        return (
          <Button className="bg-gray-500 hover:bg-gray-600 w-32" onClick={() => updateOrderStatus(id, 'COMPLETED')}>
            Complete
          </Button>
        );
      default:
        return null;
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === null || order.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

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

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
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
            <div className="relative">
              <Filter className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="in progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <Button variant="outline">Export Orders</Button>
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
              {filteredOrders.map((order) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{order.total?.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expandedOrder === order.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
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
                                    <td className="px-4 py-2 text-sm">{item.menuItem?.price?.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="mt-4 flex justify-between">
                            <div className="space-x-2">
                              {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                                <>
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateOrderStatus(order.id, 'COMPLETED');
                                    }}
                                  >
                                    Mark Completed
                                  </Button>
                                  {order.status === 'New' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateOrderStatus(order.id, 'PREPARING');
                                      }}
                                    >
                                      Start Preparing
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                            {order.status !== 'Cancelled' && (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOrderStatus(order.id, 'CANCELLED');
                                }}
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
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No orders found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 
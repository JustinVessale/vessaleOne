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
import { Printer, Loader2 } from 'lucide-react';

const client = generateClient<Schema>();

export function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No orders yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id.substring(0, 8)}</TableCell>
                  <TableCell>{order.customerName || 'Guest'}</TableCell>
                  <TableCell>
                    <ul className="list-disc pl-5">
                      {order.items?.map((item: any, index: number) => (
                        <li key={index}>
                          {item.quantity}x {item.menuItem?.name || 'Unknown Item'}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell>{format(new Date(order.createdAt), 'MMM d, h:mm a')}</TableCell>
                  <TableCell>${order.total?.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{getActionButton(order)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 
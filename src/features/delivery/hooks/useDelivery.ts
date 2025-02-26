import { useState } from 'react';
import { 
  createDelivery, 
  getDelivery, 
  cancelDelivery,
  NashDeliveryRequest,
  NashDeliveryResponse
} from '@/lib/services/nashService';
import { useToast } from '@/hooks/use-toast';

interface DeliveryState {
  isCreating: boolean;
  isLoading: boolean;
  isCancelling: boolean;
  delivery: NashDeliveryResponse | null;
  error: string | null;
}

export function useDelivery() {
  const [state, setState] = useState<DeliveryState>({
    isCreating: false,
    isLoading: false,
    isCancelling: false,
    delivery: null,
    error: null,
  });
  const { toast } = useToast();

  // Create a new delivery
  const createNewDelivery = async (deliveryRequest: NashDeliveryRequest) => {
    setState(prev => ({ ...prev, isCreating: true, error: null }));
    
    try {
      const delivery = await createDelivery(deliveryRequest);
      setState(prev => ({ ...prev, delivery, isCreating: false }));
      return delivery;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create delivery';
      setState(prev => ({ ...prev, isCreating: false, error: errorMessage }));
      toast({
        title: 'Delivery Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Fetch delivery details
  const fetchDelivery = async (deliveryId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const delivery = await getDelivery(deliveryId);
      setState(prev => ({ ...prev, delivery, isLoading: false }));
      return delivery;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch delivery';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      toast({
        title: 'Delivery Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Cancel a delivery
  const cancelActiveDelivery = async (reason?: string) => {
    if (!state.delivery) {
      toast({
        title: 'Error',
        description: 'No active delivery to cancel',
        variant: 'destructive',
      });
      return;
    }
    
    setState(prev => ({ ...prev, isCancelling: true, error: null }));
    
    try {
      const cancelledDelivery = await cancelDelivery(state.delivery.id, reason);
      setState(prev => ({ 
        ...prev, 
        delivery: cancelledDelivery, 
        isCancelling: false 
      }));
      
      toast({
        title: 'Delivery Cancelled',
        description: 'Your delivery has been cancelled successfully',
      });
      
      return cancelledDelivery;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel delivery';
      setState(prev => ({ ...prev, isCancelling: false, error: errorMessage }));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    ...state,
    createDelivery: createNewDelivery,
    fetchDelivery,
    cancelDelivery: cancelActiveDelivery,
  };
} 
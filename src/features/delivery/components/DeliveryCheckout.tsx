import { useState } from 'react';
import { DeliveryForm, DeliveryFormData } from './DeliveryForm';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/features/cart/context/CartContext';
import { formatCurrency } from '@/utils/currency';
import { useErrorHandler, ErrorMessages } from '@/utils/error-handler';
import { 
  createOrderWithQuotes, 
  NashOrderResponse,
  findPreferredQuote
} from '@/lib/services/nashService';

export interface DeliveryCheckoutProps {
  restaurantAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  restaurantName: string;
  restaurantPhone: string;
  orderId: string; // Make this required
  onContinue: (deliveryData: {
    address: string;
    deliveryFee: number;
    quoteId: string;
    estimatedDeliveryTime: string;
    nashOrderId?: string;
  }) => void;
  onSwitchToPickup?: () => void; // Add new prop for pickup switch
}

export function DeliveryCheckout({ 
  restaurantAddress, 
  restaurantName,
  restaurantPhone,
  orderId,
  onContinue,
  onSwitchToPickup
}: DeliveryCheckoutProps) {
  const [deliveryFormData, setDeliveryFormData] = useState<DeliveryFormData | null>(null);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const { toast } = useToast();
  const { handleApiError, showErrorToast } = useErrorHandler();
  const { state } = useCart();

  // Convert cart items to Nash delivery items format expected by the API
  const cartItemsToDeliveryItems = () => {
    return state.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }));
  };

  // Fetch delivery quotes when form is submitted
  const handleDeliveryFormSubmit = async (formData: DeliveryFormData) => {
    setDeliveryFormData(formData);
    setIsLoadingQuotes(true);
    
    try {
      // Create an order with Nash to get quotes
      const orderResponse = await createOrderWithQuotes({
        pickup: {
          address: restaurantAddress,
          contact: {
            name: restaurantName,
            phone: restaurantPhone
          }
        },
        dropoff: {
          address: formData.address,
          contact: formData.contact
        },
        items: cartItemsToDeliveryItems(),
        externalId: orderId
      });
      
      // Check if we have quotes
      if (orderResponse.quotes && orderResponse.quotes.length > 0) {
        // Find the preferred quote (with autodispatch_preferred_quote tag)
        const preferredQuote = findPreferredQuote(orderResponse.quotes);
        
        if (preferredQuote && orderResponse.id) {
          // We no longer need to select the quote here since we'll autodispatch after payment
          // Just format the address for display
          const formattedAddress = `${formData.address.street}, ${formData.address.city}, ${formData.address.state} ${formData.address.zip}`;
          
          // Use totalPriceCents instead of priceCents for the delivery fee
          const deliveryFee = preferredQuote.totalPriceCents 
            ? preferredQuote.totalPriceCents / 100 
            : preferredQuote.priceCents / 100;
          
          console.log('Selected quote:', preferredQuote);
          console.log(`Using delivery fee: $${deliveryFee} (${preferredQuote.totalPriceCents ? 'totalPriceCents' : 'priceCents'})`);
          
          // Continue to payment with the delivery details
          onContinue({
            address: formattedAddress,
            deliveryFee: deliveryFee,
            quoteId: preferredQuote.id,
            estimatedDeliveryTime: preferredQuote.dropoffEta,
            nashOrderId: orderResponse.id || ''
          });
          
          // Show confirmation toast
          toast({
            title: "Delivery Option Confirmed",
            description: `${preferredQuote.providerName} delivery for ${formatCurrency(deliveryFee)}`,
            variant: "default",
          });
        } else {
          showErrorToast('No delivery options available for this address');
          offerPickupSwitch();
        }
      } else {
        showErrorToast('No delivery options available for this address');
        offerPickupSwitch();
      }
    } catch (error) {
      console.error('Error creating Nash order:', error);
      handleApiError(error, ErrorMessages.DELIVERY.QUOTES_FETCH_FAILED);
      offerPickupSwitch();
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  // Helper function to offer pickup switch
  const offerPickupSwitch = () => {
    if (onSwitchToPickup) {
      toast({
        title: 'Switch to Pickup?',
        description: 'Delivery is currently unavailable. Would you like to switch to pickup instead?',
        action: (
          <button 
            onClick={onSwitchToPickup}
            className="px-3 py-1 rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            Switch to Pickup
          </button>
        ),
      });
    }
  };

  return (
    <div className="space-y-6">
      {!deliveryFormData ? (
        <DeliveryForm onSubmit={handleDeliveryFormSubmit} isLoading={isLoadingQuotes} />
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Delivery Address</h3>
            <p>{deliveryFormData.address.street}</p>
            <p>
              {deliveryFormData.address.city}, {deliveryFormData.address.state}{' '}
              {deliveryFormData.address.zip}
            </p>
            {deliveryFormData.address.instructions && (
              <p className="mt-2 text-sm text-gray-600">
                Instructions: {deliveryFormData.address.instructions}
              </p>
            )}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setDeliveryFormData(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Edit Address
              </button>
            </div>
          </div>

          {/* Show loading state */}
          {isLoadingQuotes && (
            <div className="py-8 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-gray-600">Finding delivery options...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
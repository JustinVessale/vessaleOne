import { useState } from 'react';
import { DeliveryForm, DeliveryFormData } from './DeliveryForm';
import { DeliveryQuotesList } from './DeliveryQuote';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/features/cart/context/CartContext';
import { formatCurrency } from '@/utils/currency';
import { useErrorHandler, ErrorMessages } from '@/utils/error-handler';
import { 
  createOrderWithQuotes, 
  selectQuote, 
  NashOrderResponse,
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
  const [nashOrder, setNashOrder] = useState<NashOrderResponse | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [isProcessingQuote, setIsProcessingQuote] = useState(false);
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
      
      setNashOrder(orderResponse);
      
      // If we have quotes, select the first one by default
      if (orderResponse.quotes && orderResponse.quotes.length > 0) {
        setSelectedQuoteId(orderResponse.quotes[0].id);
      }
    } catch (error) {
      console.error('Error creating Nash order:', error);
      handleApiError(error, ErrorMessages.DELIVERY.QUOTES_FETCH_FAILED);
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  // Handle quote selection
  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    
    // Find the selected quote for feedback
    const selectedQuote = nashOrder?.quotes?.find(q => q.id === quoteId);
    
    if (selectedQuote) {
      toast({
        title: "Delivery Option Selected",
        description: `${selectedQuote.providerName} delivery for ${formatCurrency(selectedQuote.priceCents / 100)}`,
        variant: "default",
      });
    }
  };

  // Handle continue to payment
  const handleContinue = async () => {
    if (!deliveryFormData) {
      showErrorToast('Please enter delivery information');
      return;
    }

    // If we have quotes but none selected, show error
    if (nashOrder?.quotes && nashOrder.quotes.length > 0 && !selectedQuoteId) {
      showErrorToast('Please select a delivery option');
      return;
    }

    // Find the selected quote
    const selectedQuote = nashOrder?.quotes?.find(q => q.id === selectedQuoteId);
      
    if (nashOrder?.quotes && nashOrder.quotes.length > 0 && !selectedQuote) {
      showErrorToast('Invalid delivery option selected');
      return;
    }

    if (!selectedQuote) {
      showErrorToast('Please select a delivery option to continue.');
      return;
    }

    setIsProcessingQuote(true);

    // Format the address for display
    const formattedAddress = `${deliveryFormData.address.street}, ${deliveryFormData.address.city}, ${deliveryFormData.address.state} ${deliveryFormData.address.zip}`;

    if (nashOrder && nashOrder.id && selectedQuote) {
      try {
        // Select the quote with Nash
        await selectQuote(nashOrder.id, selectedQuote.id);
        
        // Continue to payment with the delivery details
        onContinue({
          address: formattedAddress,
          deliveryFee: selectedQuote.priceCents / 100,
          quoteId: selectedQuote.id,
          estimatedDeliveryTime: selectedQuote.dropoffEta,
          nashOrderId: nashOrder.id
        });
      } catch (error) {
        console.error('Error selecting quote:', error);
        handleApiError(error, ErrorMessages.DELIVERY.QUOTE_SELECTION_FAILED);
        
        // Offer option to switch to pickup if available
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
      } finally {
        setIsProcessingQuote(false);
      }
    } else {
      setIsProcessingQuote(false);
      showErrorToast(ErrorMessages.DELIVERY.DELIVERY_SETUP_FAILED);
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

          {/* Always render the DeliveryQuotesList component */}
          <DeliveryQuotesList
            quotes={nashOrder ? [nashOrder] : []}
            selectedQuoteId={selectedQuoteId}
            onSelectQuote={handleSelectQuote}
            isLoading={isLoadingQuotes}
            onSwitchToPickup={onSwitchToPickup}
          />

          {(nashOrder?.quotes?.length ?? 0) > 0 && (
            <button
              onClick={handleContinue}
              disabled={isProcessingQuote}
              className="w-full flex justify-center py-3.5 px-4 border border-primary-700 rounded-lg shadow-sm text-base font-medium text-black bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors mt-6"
            >
              {isProcessingQuote ? 'Processing...' : 'Continue to Payment'}
            </button>
          )}
        </div>
      )}
    </div>
  );
} 
import { useState, useEffect } from 'react';
import { DeliveryForm, DeliveryFormData } from './DeliveryForm';
import { DeliveryQuotesList } from './DeliveryQuote';
import { 
  getDeliveryQuote, 
  NashQuoteResponse, 
  NashQuoteRequest,
  NashDeliveryItem
} from '@/lib/services/nashService';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/features/cart/context/CartContext';

interface DeliveryCheckoutProps {
  restaurantAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  restaurantName: string;
  restaurantPhone: string;
  onContinue: (deliveryData: {
    address: string;
    deliveryFee: number;
    quoteId: string;
    estimatedDeliveryTime: string;
  }) => void;
}

export function DeliveryCheckout({ 
  restaurantAddress, 
  restaurantName,
  restaurantPhone,
  onContinue 
}: DeliveryCheckoutProps) {
  const [deliveryFormData, setDeliveryFormData] = useState<DeliveryFormData | null>(null);
  const [quotes, setQuotes] = useState<NashQuoteResponse[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const { toast } = useToast();
  const { state } = useCart();

  // Convert cart items to Nash delivery items
  const cartItemsToDeliveryItems = (): NashDeliveryItem[] => {
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
      const quoteRequest: NashQuoteRequest = {
        pickup: {
          address: {
            street: restaurantAddress.street,
            city: restaurantAddress.city,
            state: restaurantAddress.state,
            zip: restaurantAddress.zip,
          },
          contact: {
            name: restaurantName,
            phone: restaurantPhone,
          },
        },
        dropoff: {
          address: formData.address,
          contact: formData.contact,
        },
        items: cartItemsToDeliveryItems(),
      };
      
      // Call Nash API to get delivery quotes
      const quoteResponse = await getDeliveryQuote(quoteRequest);
      
      // For demo purposes, if we get a single quote back, create multiple options
      // In production, you would use the actual response from Nash
      if (Array.isArray(quoteResponse)) {
        setQuotes(quoteResponse);
      } else {
        // Create a fake array of quotes for demo purposes
        const demoQuotes = [
          quoteResponse,
          {
            ...quoteResponse,
            id: 'demo-quote-2',
            provider: 'Express Delivery',
            fee: quoteResponse.fee * 1.2,
            estimated_pickup_time: new Date(Date.now() + 15 * 60000).toISOString(),
            estimated_dropoff_time: new Date(Date.now() + 30 * 60000).toISOString(),
          },
          {
            ...quoteResponse,
            id: 'demo-quote-3',
            provider: 'Premium Delivery',
            fee: quoteResponse.fee * 1.5,
            estimated_pickup_time: new Date(Date.now() + 10 * 60000).toISOString(),
            estimated_dropoff_time: new Date(Date.now() + 25 * 60000).toISOString(),
          }
        ];
        setQuotes(demoQuotes);
      }
      
      // Select the first quote by default
      if (quotes.length > 0) {
        setSelectedQuoteId(quotes[0].id);
      }
    } catch (error) {
      console.error('Error fetching delivery quotes:', error);
      toast({
        title: 'Error',
        description: 'Failed to get delivery quotes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  // Handle quote selection
  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
  };

  // Handle continue to payment
  const handleContinue = () => {
    if (!deliveryFormData || !selectedQuoteId) {
      toast({
        title: 'Error',
        description: 'Please select a delivery option',
        variant: 'destructive',
      });
      return;
    }

    const selectedQuote = quotes.find(q => q.id === selectedQuoteId);
    if (!selectedQuote) {
      toast({
        title: 'Error',
        description: 'Invalid delivery option selected',
        variant: 'destructive',
      });
      return;
    }

    // Format the address as a string
    const formattedAddress = `${deliveryFormData.address.street}, ${deliveryFormData.address.city}, ${deliveryFormData.address.state} ${deliveryFormData.address.zip}`;
    
    onContinue({
      address: formattedAddress,
      deliveryFee: selectedQuote.fee,
      quoteId: selectedQuote.id,
      estimatedDeliveryTime: selectedQuote.estimated_dropoff_time,
    });
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
            <button
              onClick={() => setDeliveryFormData(null)}
              className="mt-2 text-sm text-primary-600 hover:text-primary-800"
            >
              Edit Address
            </button>
          </div>

          <DeliveryQuotesList
            quotes={quotes}
            selectedQuoteId={selectedQuoteId}
            onSelectQuote={handleSelectQuote}
            isLoading={isLoadingQuotes}
          />

          {quotes.length > 0 && (
            <button
              onClick={handleContinue}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Continue to Payment
            </button>
          )}
        </div>
      )}
    </div>
  );
} 
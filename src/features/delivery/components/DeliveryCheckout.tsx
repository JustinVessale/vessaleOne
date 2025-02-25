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
      
      // For development/demo purposes, use mock data by default
      // In production, you would use the actual Nash API
      if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DELIVERY !== 'false') {
        console.log('Using mock delivery quotes in development mode');
        // Create mock quotes for development/demo purposes
        const mockQuotes: NashQuoteResponse[] = [
          {
            id: 'mock-quote-1',
            provider: 'Standard Delivery',
            fee: 3.99,
            currency: 'USD',
            estimated_pickup_time: new Date(Date.now() + 20 * 60000).toISOString(),
            estimated_dropoff_time: new Date(Date.now() + 45 * 60000).toISOString(),
            estimated_pickup_distance: 2.5,
            estimated_pickup_duration: 10,
            estimated_dropoff_distance: 3.2,
            estimated_dropoff_duration: 15,
            pickup: quoteRequest.pickup,
            dropoff: quoteRequest.dropoff,
            items: quoteRequest.items
          },
          {
            id: 'mock-quote-2',
            provider: 'Express Delivery',
            fee: 5.99,
            currency: 'USD',
            estimated_pickup_time: new Date(Date.now() + 15 * 60000).toISOString(),
            estimated_dropoff_time: new Date(Date.now() + 35 * 60000).toISOString(),
            estimated_pickup_distance: 2.5,
            estimated_pickup_duration: 8,
            estimated_dropoff_distance: 3.2,
            estimated_dropoff_duration: 12,
            pickup: quoteRequest.pickup,
            dropoff: quoteRequest.dropoff,
            items: quoteRequest.items
          },
          {
            id: 'mock-quote-3',
            provider: 'Premium Delivery',
            fee: 7.99,
            currency: 'USD',
            estimated_pickup_time: new Date(Date.now() + 10 * 60000).toISOString(),
            estimated_dropoff_time: new Date(Date.now() + 30 * 60000).toISOString(),
            estimated_pickup_distance: 2.5,
            estimated_pickup_duration: 5,
            estimated_dropoff_distance: 3.2,
            estimated_dropoff_duration: 10,
            pickup: quoteRequest.pickup,
            dropoff: quoteRequest.dropoff,
            items: quoteRequest.items
          }
        ];
        setQuotes(mockQuotes);
        setSelectedQuoteId(mockQuotes[0].id);
      } else {
        // Try to use the real Nash API
        try {
          // Call Nash API to get delivery quotes
          const quoteResponse = await getDeliveryQuote(quoteRequest);
          
          // For demo purposes, if we get a single quote back, create multiple options
          // In production, you would use the actual response from Nash
          if (Array.isArray(quoteResponse)) {
            setQuotes(quoteResponse);
            if (quoteResponse.length > 0) {
              setSelectedQuoteId(quoteResponse[0].id);
            }
          } else {
            // Create a fake array of quotes for demo purposes
            const demoQuotes: NashQuoteResponse[] = [
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
            setSelectedQuoteId(demoQuotes[0].id);
          }
        } catch (error) {
          console.error('Error fetching Nash quotes:', error);
          // Fallback to mock quotes if the API call fails
          const mockQuotes: NashQuoteResponse[] = [
            {
              id: 'mock-quote-1',
              provider: 'Standard Delivery',
              fee: 3.99,
              currency: 'USD',
              estimated_pickup_time: new Date(Date.now() + 20 * 60000).toISOString(),
              estimated_dropoff_time: new Date(Date.now() + 45 * 60000).toISOString(),
              estimated_pickup_distance: 2.5,
              estimated_pickup_duration: 10,
              estimated_dropoff_distance: 3.2,
              estimated_dropoff_duration: 15,
              pickup: quoteRequest.pickup,
              dropoff: quoteRequest.dropoff,
              items: quoteRequest.items
            },
            {
              id: 'mock-quote-2',
              provider: 'Express Delivery',
              fee: 5.99,
              currency: 'USD',
              estimated_pickup_time: new Date(Date.now() + 15 * 60000).toISOString(),
              estimated_dropoff_time: new Date(Date.now() + 35 * 60000).toISOString(),
              estimated_pickup_distance: 2.5,
              estimated_pickup_duration: 8,
              estimated_dropoff_distance: 3.2,
              estimated_dropoff_duration: 12,
              pickup: quoteRequest.pickup,
              dropoff: quoteRequest.dropoff,
              items: quoteRequest.items
            },
            {
              id: 'mock-quote-3',
              provider: 'Premium Delivery',
              fee: 7.99,
              currency: 'USD',
              estimated_pickup_time: new Date(Date.now() + 10 * 60000).toISOString(),
              estimated_dropoff_time: new Date(Date.now() + 30 * 60000).toISOString(),
              estimated_pickup_distance: 2.5,
              estimated_pickup_duration: 5,
              estimated_dropoff_distance: 3.2,
              estimated_dropoff_duration: 10,
              pickup: quoteRequest.pickup,
              dropoff: quoteRequest.dropoff,
              items: quoteRequest.items
            }
          ];
          setQuotes(mockQuotes);
          setSelectedQuoteId(mockQuotes[0].id);
          toast({
            title: 'Using mock delivery quotes',
            description: 'Could not connect to Nash API. Using mock data for demonstration.',
            variant: 'default',
          });
        }
      }
    } catch (error) {
      console.error('Error in delivery form submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to process delivery information. Please try again.',
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
    if (!deliveryFormData) {
      toast({
        title: 'Error',
        description: 'Please enter delivery information',
        variant: 'destructive',
      });
      return;
    }

    // If we have quotes but none selected, show error
    if (quotes.length > 0 && !selectedQuoteId) {
      toast({
        title: 'Error',
        description: 'Please select a delivery option',
        variant: 'destructive',
      });
      return;
    }

    // Get the selected quote or use a default if none available
    const selectedQuote = selectedQuoteId 
      ? quotes.find(q => q.id === selectedQuoteId)
      : null;
      
    if (quotes.length > 0 && !selectedQuote) {
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
      deliveryFee: selectedQuote?.fee || 3.99, // Default fee if no quote
      quoteId: selectedQuote?.id || 'default-quote',
      estimatedDeliveryTime: selectedQuote?.estimated_dropoff_time || new Date(Date.now() + 45 * 60000).toISOString(),
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
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setDeliveryFormData(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Edit Address
              </button>
              <button
                onClick={handleContinue}
                className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Skip to Payment
              </button>
            </div>
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
              className="w-full flex justify-center py-3.5 px-4 border border-primary-700 rounded-lg shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors mt-6"
            >
              Continue to Payment
            </button>
          )}
        </div>
      )}
    </div>
  );
} 
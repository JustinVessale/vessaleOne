import { useState, useEffect } from 'react';
import { NashOrderResponse, NashQuote } from '@/lib/services/nashService';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';

// Remove debug mode for production
const DEBUG_MODE = false;

interface QuoteItemProps {
  quoteItem: NashQuote;
  onSelect: () => void;
  isSelected: boolean;
}

export function QuoteItem({ quoteItem, onSelect, isSelected }: QuoteItemProps) {
  const [estimatedDropoffTime, setEstimatedDropoffTime] = useState<Date | null>(null);

  useEffect(() => {
    if (quoteItem.dropoffEta) {
      setEstimatedDropoffTime(new Date(quoteItem.dropoffEta));
    }
  }, [quoteItem]);

  return (
    <label 
      className={`block border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected 
          ? 'border-primary-500 bg-primary-50' 
          : 'border-gray-200 hover:border-primary-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <input
              type="radio"
              name="delivery-quote"
              checked={isSelected}
              onChange={onSelect}
              className="h-5 w-5 text-primary-500 focus:ring-primary-500 cursor-pointer"
            />
          </div>
          <div>
            <span className="font-medium block">
              {quoteItem.providerName}
            </span>
            <span className="text-sm text-gray-600 block mt-1">
              {estimatedDropoffTime && (
                <>Estimated delivery by {format(estimatedDropoffTime, 'h:mm a')}</>
              )}
            </span>
          </div>
        </div>
        <div className="text-right ml-4 flex-shrink-0">
          <span className="font-medium block">{formatCurrency(quoteItem.priceCents / 100)}</span>
          <span className="text-sm text-gray-600 block">Delivery fee</span>
        </div>
      </div>
    </label>
  );
}

interface DeliveryQuotesListProps {
  quotes: NashOrderResponse[];
  selectedQuoteId: string | null;
  onSelectQuote: (quoteId: string) => void;
  isLoading: boolean;
  onSwitchToPickup?: () => void;
}

export function DeliveryQuotesList({ 
  quotes, 
  selectedQuoteId, 
  onSelectQuote,
  isLoading,
  onSwitchToPickup 
}: DeliveryQuotesListProps) {
  if (isLoading) {
    return (
      <div className="py-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Flatten all quote items from all orders
  const allQuoteItems: NashQuote[] = [];
  quotes.forEach(order => {
    if (order.quotes && order.quotes.length > 0) {
      allQuoteItems.push(...order.quotes);
    }
  });

  if (allQuoteItems.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="mb-4 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No delivery options available</h3>
        <p className="text-gray-600 mb-6 max-w-md">We're unable to deliver to this address at the moment. You can switch to pickup instead.</p>
        
        {onSwitchToPickup && (
          <button
            onClick={onSwitchToPickup}
            className="px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 w-full max-w-xs"
          >
            Switch to Pickup
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Select Delivery Option</h3>
      <div className="space-y-3">
        {allQuoteItems.map((quoteItem) => (
          <QuoteItem
            key={quoteItem.id}
            quoteItem={quoteItem}
            isSelected={selectedQuoteId === quoteItem.id}
            onSelect={() => onSelectQuote(quoteItem.id)}
          />
        ))}
      </div>
    </div>
  );
}


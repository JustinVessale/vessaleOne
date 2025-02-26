import { useState, useEffect } from 'react';
import { NashOrderResponse, NashQuote } from '@/lib/services/nashService';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';

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
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected 
          ? 'border-primary-500 bg-primary-50' 
          : 'border-gray-200 hover:border-primary-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-5 h-5 rounded-full border ${
            isSelected 
              ? 'border-primary-500 bg-primary-500' 
              : 'border-gray-300'
          }`}>
            {isSelected && (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="white" 
                className="w-5 h-5"
              >
                <path 
                  fillRule="evenodd" 
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" 
                  clipRule="evenodd" 
                />
              </svg>
            )}
          </div>
          <div>
            <h3 className="font-medium">{quoteItem.providerName}</h3>
            <p className="text-sm text-gray-600">
              {estimatedDropoffTime && (
                <>Estimated delivery by {format(estimatedDropoffTime, 'h:mm a')}</>
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium">{formatCurrency(quoteItem.priceCents / 100)}</p>
          <p className="text-sm text-gray-600">Delivery fee</p>
        </div>
      </div>
      
      {isSelected && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <div>
              <p className="font-medium">Delivery Time</p>
              <p className="text-gray-600">
                {estimatedDropoffTime 
                  ? format(estimatedDropoffTime, 'h:mm a') 
                  : 'Not available'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DeliveryQuotesListProps {
  quotes: NashOrderResponse[];
  selectedQuoteId: string | null;
  onSelectQuote: (quoteId: string) => void;
  isLoading: boolean;
}

export function DeliveryQuotesList({ 
  quotes, 
  selectedQuoteId, 
  onSelectQuote,
  isLoading 
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
      <div className="py-4 text-center">
        <p className="text-gray-600">No delivery options available for this address.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Select Delivery Option</h3>
      {allQuoteItems.map((quoteItem) => (
        <QuoteItem
          key={quoteItem.id}
          quoteItem={quoteItem}
          isSelected={selectedQuoteId === quoteItem.id}
          onSelect={() => onSelectQuote(quoteItem.id)}
        />
      ))}
    </div>
  );
} 
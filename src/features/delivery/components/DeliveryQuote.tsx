import { useState, useEffect } from 'react';
import { NashQuoteResponse } from '@/lib/services/nashService';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';

interface DeliveryQuoteProps {
  quote: NashQuoteResponse;
  onSelect: () => void;
  isSelected: boolean;
}

export function DeliveryQuote({ quote, onSelect, isSelected }: DeliveryQuoteProps) {
  const [estimatedPickupTime, setEstimatedPickupTime] = useState<Date | null>(null);
  const [estimatedDropoffTime, setEstimatedDropoffTime] = useState<Date | null>(null);

  useEffect(() => {
    if (quote.estimated_pickup_time) {
      setEstimatedPickupTime(new Date(quote.estimated_pickup_time));
    }
    
    if (quote.estimated_dropoff_time) {
      setEstimatedDropoffTime(new Date(quote.estimated_dropoff_time));
    }
  }, [quote]);

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
            <h3 className="font-medium">{quote.provider}</h3>
            <p className="text-sm text-gray-600">
              {estimatedDropoffTime && (
                <>Estimated delivery by {format(estimatedDropoffTime, 'h:mm a')}</>
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium">{formatCurrency(quote.fee)}</p>
          <p className="text-sm text-gray-600">Delivery fee</p>
        </div>
      </div>
      
      {isSelected && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <div>
              <p className="font-medium">Pickup Time</p>
              <p className="text-gray-600">
                {estimatedPickupTime 
                  ? format(estimatedPickupTime, 'h:mm a') 
                  : 'Not available'}
              </p>
            </div>
            <div>
              <p className="font-medium">Delivery Time</p>
              <p className="text-gray-600">
                {estimatedDropoffTime 
                  ? format(estimatedDropoffTime, 'h:mm a') 
                  : 'Not available'}
              </p>
            </div>
            <div>
              <p className="font-medium">Distance</p>
              <p className="text-gray-600">
                {quote.estimated_dropoff_distance.toFixed(1)} mi
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DeliveryQuotesListProps {
  quotes: NashQuoteResponse[];
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

  if (quotes.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-gray-600">No delivery options available for this address.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Select Delivery Option</h3>
      {quotes.map((quote) => (
        <DeliveryQuote
          key={quote.id}
          quote={quote}
          isSelected={selectedQuoteId === quote.id}
          onSelect={() => onSelectQuote(quote.id)}
        />
      ))}
    </div>
  );
} 
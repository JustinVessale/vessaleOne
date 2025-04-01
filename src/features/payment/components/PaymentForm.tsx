import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { StripeError, PaymentIntent } from '@stripe/stripe-js';
import { useCart } from '@/features/cart/context/CartContext';
import { formatCurrency } from '@/utils/currency';
import type { Schema } from '../../../../amplify/data/resource';

type Order = Schema['Order']['type'];

export type PaymentFormProps = {
  onSuccess: (paymentIntent: PaymentIntent) => Promise<void>;
  onError: (error: StripeError) => void;
  order: Order | null;
};

export function PaymentForm({ onSuccess, onError, order }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { state, total } = useCart();

  // Log order details for debugging
  console.log('PaymentForm order details:', {
    id: order?.id,
    total: order?.total,
    isDelivery: order?.isDelivery,
    deliveryFee: order?.deliveryFee,
    deliveryInfo: order?.deliveryInfo
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        onError(error);
      } else if (paymentIntent) {
        await onSuccess(paymentIntent);
      }
    } catch (e) {
      onError(e as StripeError);
    } finally {
      setIsProcessing(false);
    }
  };

  const deliveryFee = order?.deliveryFee || 0;
  const isDelivery = order?.isDelivery || false;
  const subtotal = total;
  
  // Calculate the total by adding the subtotal and delivery fee
  // Use toFixed(2) and parseFloat to avoid floating-point precision issues
  const orderTotal = parseFloat((subtotal + deliveryFee).toFixed(2));
  
  // Log calculated totals for debugging
  console.log('PaymentForm calculated totals:', {
    subtotal,
    deliveryFee,
    orderTotal,
    orderTotalFromOrder: order?.total
  });

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
        
        {/* Cart Items */}
        <div className="space-y-3 mb-4">
          {state.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="font-medium mr-2">{item.quantity}x</span>
                <span>{item.name}</span>
              </div>
              <span className="text-gray-700">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>
        
        {/* Subtotal */}
        <div className="flex justify-between text-gray-700">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        
        {/* Delivery Fee (if applicable) */}
        {isDelivery && (
          <div className="flex justify-between text-gray-700 mt-2">
            <span>Delivery Fee</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
        )}
        
        {/* Total */}
        <div className="flex justify-between text-lg font-medium mt-3 pt-3 border-t border-gray-200">
          <span>Total</span>
          <span>{formatCurrency(orderTotal)}</span>
        </div>
      </div>
      
      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Details</h3>
        <PaymentElement />
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Processing...' : `Pay ${formatCurrency(orderTotal)}`}
        </Button>
      </form>
    </div>
  );
} 
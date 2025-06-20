import { useCart } from '../../cart/context/CartContext';
import { CheckoutPage } from './CheckoutPage';

export function CheckoutPageWrapper() {
  const { state, checkRestaurantStatus } = useCart();
  
  // If no items in cart, redirect or show error
  if (state.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Items in Cart</h2>
          <p className="text-gray-600 mb-6">
            Please add items to your cart before proceeding to checkout.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Get restaurant status from cart context
  const restaurantIsOpen = state.restaurantIsOpen ?? true;
  const locationIsOpen = state.locationIsOpen !== null ? state.locationIsOpen : undefined;

  // Pass the restaurant status to the CheckoutPage
  return (
    <CheckoutPage 
      restaurantIsOpen={restaurantIsOpen}
      locationIsOpen={locationIsOpen}
    />
  );
} 
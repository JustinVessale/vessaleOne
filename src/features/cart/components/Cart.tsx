import { XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/solid';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { StorageImage } from '@/components/ui/s3-image';
import { useState, useEffect } from 'react';

export function Cart() {
  const { state, removeItem, updateQuantity, toggleCart, subtotal, serviceFee, total, checkRestaurantStatus } = useCart();
  const navigate = useNavigate();

  // Track if we're on mobile screen
  const [isMobile, setIsMobile] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Determine if the restaurant is open based on location or restaurant status
  const isOpen = state.locationIsOpen !== null ? state.locationIsOpen : (state.restaurantIsOpen ?? true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check restaurant status when cart mounts if there are items and no recent check
  useEffect(() => {
    if (state.items.length > 0 && state.lastRestaurantCheck === null) {
      setIsCheckingStatus(true);
      checkRestaurantStatus()
        .catch(console.error)
        .finally(() => setIsCheckingStatus(false));
    }
  }, [state.items.length, state.lastRestaurantCheck, checkRestaurantStatus]);

  const handleCheckout = async () => {
    setIsCheckingStatus(true);
    try {
      // Always check restaurant status before checkout
      const status = await checkRestaurantStatus();
      const currentIsOpen = status.locationIsOpen !== undefined ? status.locationIsOpen : status.restaurantIsOpen;
      
      if (!currentIsOpen) {
        return; // Don't allow checkout if restaurant is closed
      }
      
      if (state.isOpen) {
        toggleCart(); // Close mobile cart if open
      }
      navigate('/checkout');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const CartContent = () => (
    <div className="flex flex-col h-full">
      {/* Cart Items */}
      <div className="flex-1 overflow-auto p-4">
        {state.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ShoppingBagIcon className="h-12 w-12 mb-4" />
            <p className="text-lg">Your cart is empty</p>
          </div>
        ) : (
          <>
            {state.items.map((item) => (
              <div key={item.id} className="flex items-start space-x-4 mb-6">
                {item.imageUrl ? (
                  <StorageImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <ShoppingBagIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{item.name}</h3>
                    <span className="text-lg font-semibold ml-4">${item.price.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center border rounded-full px-2">
                      <button 
                        className="p-2" 
                        onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                      >
                        -
                      </button>
                      <span className="px-4">{item.quantity}</span>
                      <button 
                        className="p-2" 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button 
                      className="text-red-500 hover:text-red-700 px-3 py-1"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Cart Footer */}
      {state.items.length > 0 && (
        <div className="border-t p-4 space-y-4">
          {/* Subtotal */}
          <div className="flex justify-between items-center text-gray-700">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          
          {/* Service Fee */}
          <div className="flex justify-between items-center text-gray-700">
            <span>Service Fee</span>
            <span>${serviceFee.toFixed(2)}</span>
          </div>
          
          {/* Total */}
          <div className="flex justify-between items-center text-lg font-semibold border-t pt-2">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          
          {/* Restaurant Status Warning */}
          {!isOpen && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm font-medium">
                Restaurant is currently closed
              </p>
              <p className="text-red-600 text-xs mt-1">
                Orders will be disabled until the restaurant reopens
              </p>
            </div>
          )}
          
          {isCheckingStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm font-medium flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Checking restaurant status...
              </p>
            </div>
          )}
          
          <button 
            className={`w-full py-3 px-4 rounded-lg font-medium
                       border-2 focus:outline-none focus:ring-2 focus:ring-offset-2
                       shadow-sm transition-colors ${
                         isOpen && !isCheckingStatus
                           ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600 focus:ring-blue-500'
                           : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                       }`}
            onClick={handleCheckout}
            disabled={!isOpen || isCheckingStatus}
          >
            {isCheckingStatus ? 'Checking...' : (isOpen ? 'Go to Checkout' : 'Currently Closed')}
          </button>
        </div>
      )}
    </div>
  );

  // Desktop version (already rendered in RestaurantPage.tsx)
  return (
    <>
      {/* Desktop version */}
      <div className="bg-white rounded-lg shadow-lg p-4 h-full">
        <div className="flex items-center justify-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Your order</h2>
        </div>
        <CartContent />
      </div>

      {/* Mobile version (slide-up panel) - Only show on mobile screens */}
      {state.isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end"
          style={{ 
            zIndex: 9999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              toggleCart();
            }
          }}
        >
          <div 
            className="w-full bg-white shadow-xl rounded-t-xl"
            style={{ 
              maxHeight: '80vh',
              minHeight: '50vh'
            }}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex-1 text-center">
                <h2 className="text-xl font-semibold text-gray-900">Your order</h2>
              </div>
              <button
                onClick={toggleCart}
                className="rounded-full p-2 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <CartContent />
          </div>
        </div>
      )}
    </>
  );
}
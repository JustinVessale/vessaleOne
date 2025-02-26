import { XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/solid';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

export function Cart() {
  const { state, removeItem, updateQuantity, toggleCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (state.isOpen) {
      toggleCart(); // Close mobile cart if open
    }
    navigate('/checkout');
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
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
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
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Subtotal</span>
            <span className="text-lg font-semibold">
              ${state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)}
            </span>
          </div>
          
          <button 
            className="w-full bg-blue-400 text-white py-3 px-4 rounded-lg 
                       hover:bg-blue-500 transition-colors font-medium
                       border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                       shadow-sm"
            onClick={handleCheckout}
          >
            Go to Checkout
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

      {/* Mobile version (slide-up panel) */}
      <div className={`fixed inset-0 z-[100] lg:hidden ${state.isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div 
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            state.isOpen ? 'opacity-100' : 'opacity-0'
          }`} 
          onClick={toggleCart} 
        />
        <div className="absolute inset-x-0 bottom-0 max-h-[80vh] flex">
          <div 
            className={`w-full bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out rounded-t-xl ${
              state.isOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
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
      </div>
    </>
  );
}
import { XMarkIcon, MinusIcon, PlusIcon, ShoppingBagIcon } from '@heroicons/react/24/solid';
import { useCart } from '../context/CartContext';
import { useState } from 'react';

export function Cart() {
  const { state, removeItem, updateQuantity, updateInstructions, toggleCart, total } = useCart();
  const [editingInstructions, setEditingInstructions] = useState<string | null>(null);

  const CartContent = () => (
    <>
      <div className="flex-1 overflow-y-auto">
        {state.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <ShoppingBagIcon className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-500">Your cart is empty</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {state.items.map((item) => (
              <li key={item.id} className="py-6 px-4">
                <div className="flex items-start space-x-4">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-20 w-20 rounded-lg object-cover bg-gray-100"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <p className="text-base font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-base font-medium text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center border rounded-full">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="mx-2 min-w-[2rem] text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-sm font-medium text-primary-400 hover:text-primary-500"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4">
                      {editingInstructions === item.id ? (
                        <textarea
                          className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                          placeholder="Add special instructions..."
                          value={item.specialInstructions || ''}
                          onChange={(e) => updateInstructions(item.id, e.target.value)}
                          onBlur={() => setEditingInstructions(null)}
                          rows={2}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => setEditingInstructions(item.id)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          {item.specialInstructions || 'Add special instructions...'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {state.items.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Delivery Fee</span>
              <span>TBD</span>
            </div>
            <div className="flex items-center justify-between text-base font-medium text-gray-900 pt-2">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button
              className="w-full mt-4 bg-primary-400 text-white py-3 px-4 rounded-lg hover:bg-primary-500 
                         transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400
                         font-medium text-base"
            >
              Go to Checkout
            </button>
          </div>
        </div>
      )}
    </>
  );

  // Desktop version
  if (!state.isOpen) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Your order</h2>
          {state.items.length > 0 && (
            <span className="bg-primary-400 text-white px-2 py-1 rounded-full text-sm">
              {state.items.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          )}
        </div>
        <CartContent />
      </div>
    );
  }

  // Mobile version (slide-in panel)
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={toggleCart} />
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-full sm:w-96 bg-white shadow-xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Your order</h2>
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
  );
}
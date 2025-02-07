import { XMarkIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/solid';
import { useCart } from '../context/CartContext';
import { useState } from 'react';

export function Cart() {
  const { state, removeItem, updateQuantity, updateInstructions, toggleCart, total } = useCart();
  const [editingInstructions, setEditingInstructions] = useState<string | null>(null);

  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={toggleCart} />
      
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md">
          <div className="h-full flex flex-col bg-white shadow-xl">
            <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-medium text-gray-900">Shopping Cart</h2>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                  onClick={toggleCart}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-8">
                {state.items.length === 0 ? (
                  <p className="text-gray-500">Your cart is empty</p>
                ) : (
                  <div className="flow-root">
                    <ul className="divide-y divide-gray-200">
                      {state.items.map((item) => (
                        <li key={item.id} className="py-6 flex">
                          {item.imageUrl && (
                            <div className="flex-shrink-0 w-24 h-24 rounded-md overflow-hidden">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="ml-4 flex-1 flex flex-col">
                            <div>
                              <div className="flex justify-between text-base font-medium text-gray-900">
                                <h3>{item.name}</h3>
                                <p className="ml-4">${(item.price * item.quantity).toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="flex-1 flex items-end justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                                  className="p-1 rounded-full hover:bg-gray-100"
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </button>
                                <span className="font-medium">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="p-1 rounded-full hover:bg-gray-100"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="font-medium text-primary-400 hover:text-primary-500"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="mt-2">
                              {editingInstructions === item.id ? (
                                <textarea
                                  className="w-full px-2 py-1 text-sm border rounded"
                                  placeholder="Add special instructions..."
                                  value={item.specialInstructions || ''}
                                  onChange={(e) => updateInstructions(item.id, e.target.value)}
                                  onBlur={() => setEditingInstructions(null)}
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
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {state.items.length > 0 && (
              <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                <div className="flex justify-between text-base font-medium text-gray-900">
                  <p>Subtotal</p>
                  <p>${total.toFixed(2)}</p>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  Delivery fee and taxes calculated at checkout.
                </p>
                <div className="mt-6">
                  <a
                    href="/checkout"
                    className="flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-400 hover:bg-primary-500"
                  >
                    Checkout
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
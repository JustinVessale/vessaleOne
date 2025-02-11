import { ShoppingBagIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../cart/context/CartContext';

export function NavigationBar() {
  const { state, toggleCart } = useCart();
  const itemCount = state.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="text-xl font-bold text-gray-900">
              Restaurant Name
            </a>
          </div>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-2xl mx-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full 
                         text-sm placeholder-gray-500 focus:outline-none focus:ring-2 
                         focus:ring-primary-400 focus:border-primary-400"
                placeholder="Search menu items..."
              />
            </div>
          </div>

          {/* Cart Button */}
          <div className="flex items-center">
            <button
              onClick={toggleCart}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingBagIcon className="h-6 w-6 text-gray-600" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-400 text-white text-xs 
                               font-medium px-2 py-0.5 rounded-full">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search (shown below header on mobile) */}
      <div className="md:hidden border-t border-gray-200 p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="search"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full 
                     text-sm placeholder-gray-500 focus:outline-none focus:ring-2 
                     focus:ring-primary-400 focus:border-primary-400"
            placeholder="Search menu items..."
          />
        </div>
      </div>
    </nav>
  );
}
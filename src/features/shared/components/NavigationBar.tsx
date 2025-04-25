import { ShoppingBagIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../cart/context/CartContext';
import { useLocation } from 'react-router-dom';

export function NavigationBar() {
  const { toggleCart, state } = useCart();
  const location = useLocation();
  const itemCount = state.items.reduce((acc, item) => acc + item.quantity, 0);

  const hideCartPaths = ['/checkout', '/orders'];
  const shouldShowCart = !hideCartPaths.some(path => location.pathname.startsWith(path));

  if (!shouldShowCart) {
    return (
      <nav className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <a href="/" className="text-xl font-bold text-gray-900">Vessale</a>
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
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <a href="/" className="text-xl font-bold text-gray-900">Vessale</a>
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

            {/* Desktop Cart Button */}
            <div className="hidden md:flex items-center">
              <button
                onClick={toggleCart}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Shopping cart"
              >
                <ShoppingBagIcon className="h-6 w-6 text-gray-600" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Cart Button - Fixed at bottom */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleCart}
          className="bg-blue-400 text-white p-4 rounded-full shadow-lg hover:bg-blue-500 transition-colors"
          aria-label="Shopping cart"
        >
          <div className="relative">
            <ShoppingBagIcon className="h-6 w-6" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-blue-500 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-blue-400">
                {itemCount}
              </span>
            )}
          </div>
        </button>
      </div>
    </>
  );
}
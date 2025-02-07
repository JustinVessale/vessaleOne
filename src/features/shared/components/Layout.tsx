import { ReactNode } from 'react';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../cart/context/CartContext';

type LayoutProps = {
  children: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const { toggleCart, state } = useCart();
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <a href="/" className="text-2xl font-bold text-primary-400">
              Vessale
            </a>
            <button
              onClick={toggleCart}
              className="relative p-2 text-gray-600 hover:text-gray-900"
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-400 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600">
          © {new Date().getFullYear()} Vessale. All rights reserved.
        </div>
      </footer>
    </div>
  );
} 
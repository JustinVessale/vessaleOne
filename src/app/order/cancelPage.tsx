'use client';

import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';

export default function OrderCancelPage() {
  const navigate = useNavigate();
  const { restaurantSlug, locationSlug } = useParams<{ 
    restaurantSlug: string;
    locationSlug?: string;
  }>();

  // Helper function to navigate back to restaurant
  const navigateToRestaurant = () => {
    if (restaurantSlug) {
      const path = locationSlug 
        ? `/${restaurantSlug}/${locationSlug}` 
        : `/${restaurantSlug}`;
      navigate(path);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Order Cancelled</h1>
              <p className="mt-2 text-lg text-gray-600">
                Your order has been cancelled. No charges were made.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <Button
                onClick={() => navigateToRestaurant()}
                className="w-full"
              >
                Return to Restaurant
              </Button>
              <Button
                onClick={() => navigate('/checkout')}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">Need Help?</h3>
          <p className="mt-2 text-gray-600">
            If you're having trouble placing your order, please contact the restaurant.
          </p>
        </div>
      </div>
    </div>
  );
} 
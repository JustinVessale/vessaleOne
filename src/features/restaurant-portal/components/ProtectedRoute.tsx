import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    async function checkAuth() {
      try {
        // Check if user is signed in
        const user = await getCurrentUser();
        
        // Check if user is associated with a restaurant
        const { data: staffMember } = await client.models.RestaurantStaff.get({
          email: user.username,
        });

        if (!staffMember) {
          throw new Error('User is not associated with any restaurant');
        }

        // Check if restaurant is active
        const { data: restaurant } = await client.models.Restaurant.get({
          id: staffMember.restaurantId,
        });

        if (!restaurant || !restaurant.isActive) {
          throw new Error('Restaurant not found or inactive');
        }

        // Store restaurant context if not already stored
        if (!sessionStorage.getItem('restaurantId')) {
          sessionStorage.setItem('restaurantId', staffMember.restaurantId);
          sessionStorage.setItem('staffRole', staffMember.role);
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        // Clear any existing session data
        sessionStorage.removeItem('restaurantId');
        sessionStorage.removeItem('staffRole');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with return URL
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
} 
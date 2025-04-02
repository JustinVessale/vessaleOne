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
        // First check if we already have session data
        const storedRestaurantId = sessionStorage.getItem('restaurantId');
        const storedStaffRole = sessionStorage.getItem('staffRole');
        
        // If we have session data, consider user authenticated without additional API calls
        if (storedRestaurantId && storedStaffRole) {
          console.log('Session data found, user is authenticated');
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
        
        console.log('No session data found, checking authentication status');
        
        // Check if user is signed in
        const user = await getCurrentUser();
        
        // Get the email from user attributes
        const userEmail = user.signInDetails?.loginId || user.username;
        console.log('ProtectedRoute checking auth for user:', userEmail);
        
        // Check if user is associated with a restaurant using filter
        const { data: staffMembers, errors } = await client.models.RestaurantStaff.list({
          filter: {
            email: { eq: userEmail }
          } as any // Type assertion to bypass TypeScript check
        });

        if (errors) {
          console.error('Errors fetching staff for user:', errors);
          throw new Error('Error fetching staff data');
        }

        if (!staffMembers || staffMembers.length === 0) {
          throw new Error(`User with email ${userEmail} is not associated with any restaurant`);
        }
        
        const staffMember = staffMembers[0];
        const staffRestaurantId = staffMember.restaurantId || '';
        
        if (!staffRestaurantId) {
          throw new Error('Staff member has no associated restaurant');
        }
        
        // Check if restaurant is active
        const { data: restaurant, errors: restaurantErrors } = await client.models.Restaurant.get({
          id: staffRestaurantId
        });

        if (restaurantErrors) {
          console.error('Errors fetching restaurant:', restaurantErrors);
          throw new Error('Error fetching restaurant data');
        }

        if (!restaurant || !restaurant.isActive) {
          throw new Error('Restaurant not found or inactive');
        }

        // Store restaurant context
        sessionStorage.setItem('restaurantId', staffRestaurantId);
        sessionStorage.setItem('staffRole', staffMember.role || '');
        if (restaurant.name) {
          sessionStorage.setItem('restaurantName', restaurant.name);
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        // Clear any existing session data
        sessionStorage.removeItem('restaurantId');
        sessionStorage.removeItem('staffRole');
        sessionStorage.removeItem('restaurantName');
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
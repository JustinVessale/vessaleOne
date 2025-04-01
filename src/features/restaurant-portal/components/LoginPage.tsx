import { useNavigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';
import { useToast } from '@/hooks/use-toast';
import '@aws-amplify/ui-react/styles.css';
import { signOut } from 'aws-amplify/auth';

const client = generateClient<Schema>();

export function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const verifyRestaurantAccess = async (username: string) => {
    try {
      // Check if user is associated with a restaurant using filter
      const { data: staffMembers } = await client.models.RestaurantStaff.list({
        filter: {
          email: { eq: username }
        }
      });

      const staffMember = staffMembers?.[0];
      
      if (!staffMember) {
        throw new Error('User is not associated with any restaurant');
      }

      // Get restaurant details
      const { data: restaurant } = await client.models.Restaurant.get({
        id: staffMember.restaurantId || ''
      });

      if (!restaurant || !restaurant.isActive) {
        throw new Error('Restaurant not found or inactive');
      }

      // Store restaurant context
      sessionStorage.setItem('restaurantId', staffMember.restaurantId || '');
      sessionStorage.setItem('staffRole', staffMember.role || '');

      // Redirect to dashboard
      navigate('/portal/dashboard');
      
      toast({
        title: "Welcome back!",
        description: `Signed in successfully to ${restaurant.name}`,
      });
      return true;

    } catch (error) {
      console.error('Restaurant access verification failed:', error);
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: error instanceof Error ? error.message : "Unable to verify restaurant access",
      });
      // Sign out the user since they don't have restaurant access
      await signOut();
      return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Authenticator>
          {({ signOut, user }) => {
            // Verify restaurant access when user signs in
            if (user?.username) {
              verifyRestaurantAccess(user.username);
            }
            
            return (
              <div className="text-center">
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                  Restaurant Portal
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Verifying restaurant access...
                </p>
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              </div>
            );
          }}
        </Authenticator>
      </div>
    </div>
  );
} 
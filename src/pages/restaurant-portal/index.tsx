import { useEffect, useState } from 'react';
import { PortalLayout } from '@/features/restaurant-portal/components/PortalLayout';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../amplify/data/resource';
import { Loader2 } from 'lucide-react';

const client = generateClient<Schema>();

// Track page reloads to detect loops
let pageLoadCount = 0;

export default function RestaurantPortalPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  useEffect(() => {
    // Increment counter to detect loops
    pageLoadCount++;
    console.log(`RestaurantPortalPage loaded ${pageLoadCount} times`);
    
    if (pageLoadCount > 5) {
      console.error("Detected potential redirect loop. Breaking the cycle.");
      setError("Too many page reloads detected. Breaking potential redirect loop.");
      setIsLoading(false);
      return;
    }
    
    async function checkAuthAndFetchRestaurant() {
      try {
        // Skip authentication check if user just came from successful login
        const restaurantId = sessionStorage.getItem('restaurantId');
        const restaurantName = sessionStorage.getItem('restaurantName');
        
        console.log("Current session data:", { restaurantId, restaurantName });
        
        if (restaurantId && restaurantName) {
          console.log("User has valid restaurant data in session, skipping auth check");
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
        
        // Ensure we have a valid auth session first
        const authSession = await fetchAuthSession();
        console.log("Auth session tokens available:", !!authSession.tokens);
        
        if (!authSession.tokens) {
          setError("No valid authentication session. Please login again.");
          setIsLoading(false);
          return;
        }

        // Now get the user details
        const user = await getCurrentUser();
        console.log("User authenticated:", user.username);
        setIsAuthenticated(true);
        
        // Get the user's email to find their restaurant
        const userEmail = user.signInDetails?.loginId || user.username;
        console.log("Looking up staff for email:", userEmail);
        
        // Find the restaurant that the user is associated with
        const { data: staffData, errors: staffErrors } = await client.models.RestaurantStaff.list({
          filter: {
            email: { eq: userEmail }
          },
          selectionSet: ['id', 'restaurantId', 'role', 'firstName', 'lastName']
        });
        
        if (staffErrors) {
          console.error("Staff query errors:", staffErrors);
          setDebugInfo(`Staff query errors: ${JSON.stringify(staffErrors)}`);
        }
        
        console.log("Staff data retrieved:", staffData);
        
        if (!staffData || staffData.length === 0) {
          setError(`You are not associated with any restaurant. Email: ${userEmail}`);
          setIsLoading(false);
          return;
        }
        
        // Store the restaurant ID and role in session storage
        const staffMember = staffData[0];
        if (staffMember.restaurantId) sessionStorage.setItem('restaurantId', staffMember.restaurantId);
        if (staffMember.role) sessionStorage.setItem('staffRole', staffMember.role);
        
        const firstName = staffMember.firstName || '';
        const lastName = staffMember.lastName || '';
        sessionStorage.setItem('staffName', `${firstName} ${lastName}`.trim());
        
        // Fetch the restaurant name
        if (staffMember.restaurantId) {
          const { data: restaurant, errors: restaurantErrors } = await client.models.Restaurant.get({
            id: staffMember.restaurantId
          });
          
          if (restaurantErrors) {
            console.error("Restaurant query errors:", restaurantErrors);
            setDebugInfo(`Restaurant query errors: ${JSON.stringify(restaurantErrors)}`);
          }
          
          if (restaurant && restaurant.name) {
            console.log("Restaurant found:", restaurant.name);
            sessionStorage.setItem('restaurantName', restaurant.name);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error during authentication check:', error);
        setError("Authentication failed. Please log in again.");
        setDebugInfo(error instanceof Error ? error.message : String(error));
        setIsLoading(false);
        
        // Clear any previous auth data in case of errors
        sessionStorage.removeItem('restaurantId');
        sessionStorage.removeItem('staffRole');
        sessionStorage.removeItem('restaurantName');
        sessionStorage.removeItem('staffName');
      }
    }
    
    checkAuthAndFetchRestaurant();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Loading restaurant portal...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          
          {debugInfo && (
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
              <pre>{debugInfo}</pre>
            </div>
          )}
        </div>
        <button 
          onClick={() => {
            // Clear session before redirecting to avoid potential loops
            sessionStorage.clear();
            window.location.href = '/portal/login';
          }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    if (typeof window !== 'undefined') {
      // Clear session before redirecting to avoid potential loops
      sessionStorage.clear();
      window.location.href = '/portal/login';
    }
    return null;
  }

  return <PortalLayout />;
} 
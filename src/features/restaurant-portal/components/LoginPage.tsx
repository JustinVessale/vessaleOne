import { Authenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';
import { useToast } from '@/hooks/use-toast';
import '@aws-amplify/ui-react/styles.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const client = generateClient<Schema>();

export function LoginPage() {
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  // Counter to detect loops
  const renderCountRef = useRef(0);
  // Ref to track if verification has already occurred
  const hasVerifiedRef = useRef(false);

  // Add debug information about the current session state
  useEffect(() => {
    renderCountRef.current += 1;
    
    // Log session storage items to help with debugging
    const restaurantId = sessionStorage.getItem('restaurantId');
    const staffRole = sessionStorage.getItem('staffRole');
    const restaurantName = sessionStorage.getItem('restaurantName');
    
    console.log(`[LoginPage] Render #${renderCountRef.current} - Session data:`, {
      restaurantId,
      staffRole,
      restaurantName,
      pathname: window.location.pathname
    });
    
    // If we detect too many renders, it might indicate a loop
    if (renderCountRef.current > 5) {
      console.warn('[LoginPage] Too many renders detected, possible redirect loop');
      setDebugInfo(`Possible redirect loop detected. Render count: ${renderCountRef.current}. Please clear session storage and try again.`);
    }
  }, []);

  // Check if already authenticated with sessionStorage data
  useEffect(() => {
    const restaurantId = sessionStorage.getItem('restaurantId');
    const staffRole = sessionStorage.getItem('staffRole');
    
    if (restaurantId && staffRole) {
      console.log('[LoginPage] Already authenticated, redirecting to dashboard');
      // Add a delay to allow debug information to be displayed
      setTimeout(() => {
        navigate('/portal/dashboard', { replace: true });
      }, 300);
    }
  }, [navigate]);

  const listAllStaff = async () => {
    try {
      setIsLoading(true);
      const { data: allStaff, errors } = await client.models.RestaurantStaff.list({});
      console.log('All staff in database:', allStaff);
      
      if (errors) {
        console.error('Errors fetching staff:', errors);
        setDebugInfo(`Error fetching staff: ${JSON.stringify(errors)}`);
        return;
      }
      
      if (allStaff && allStaff.length > 0) {
        setDebugInfo(`Found ${allStaff.length} staff records. First record: ${JSON.stringify(allStaff[0])}`);
      } else {
        setDebugInfo('No staff records found in database. Please run the seed script!');
      }
    } catch (error) {
      console.error('Error listing all staff:', error);
      setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyRestaurantAccess = async (user: any) => {
    try {
      setIsLoading(true);
      // Get the email from signInDetails.loginId instead of username
      const userEmail = user.signInDetails?.loginId || user.username;
      console.log('Looking up restaurant staff with email:', userEmail);
      
      // Check if user is associated with a restaurant using filter
      const { data: staffMembers, errors } = await client.models.RestaurantStaff.list({
        filter: {
          email: { eq: userEmail }
        }
      });

      if (errors) {
        console.error('Errors fetching staff for user:', errors);
        setDebugInfo(`Error fetching staff for user: ${JSON.stringify(errors)}`);
        throw new Error('Error fetching staff data');
      }

      console.log('Staff members found:', staffMembers);
      
      // If no staff members found, check all staff to see if any exist
      if (!staffMembers || staffMembers.length === 0) {
        await listAllStaff();
        throw new Error(`User with email ${userEmail} is not associated with any restaurant. Please run the seed data script.`);
      }
      
      const staffMember = staffMembers[0];
      
      // Get restaurant details
      const { data: restaurant, errors: restaurantErrors } = await client.models.Restaurant.get({
        id: staffMember.restaurantId || ''
      });

      if (restaurantErrors) {
        console.error('Errors fetching restaurant:', restaurantErrors);
        setDebugInfo(`Error fetching restaurant: ${JSON.stringify(restaurantErrors)}`);
        throw new Error('Error fetching restaurant data');
      }

      console.log('Restaurant found:', restaurant);
      if (!restaurant || !restaurant.isActive) {
        throw new Error('Restaurant not found or inactive');
      }

      // Store restaurant context
      sessionStorage.setItem('restaurantId', staffMember.restaurantId || '');
      sessionStorage.setItem('staffRole', staffMember.role || '');
      if (restaurant.name) {
        sessionStorage.setItem('restaurantName', restaurant.name);
      }

      // Success message
      toast({
        title: "Welcome back!",
        description: `Signed in successfully to ${restaurant.name || 'your restaurant'}`,
      });
      
      // Redirect to restaurant portal dashboard - use React Router instead of window.location
      console.log("Redirecting to restaurant portal dashboard");
      navigate('/portal/dashboard', { replace: true });
      
      return true;

    } catch (error) {
      console.error('Restaurant access verification failed:', error);
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: error instanceof Error ? error.message : "Unable to verify restaurant access",
      });
      // Don't sign out automatically to allow debugging
      // await signOut();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Authenticator>
          {({ signOut, user }) => {
            // Verify restaurant access only once when user signs in
            if (user && !hasVerifiedRef.current && !isLoading) {
              console.log('Auth user object:', user);
              hasVerifiedRef.current = true;
              verifyRestaurantAccess(user);
            }
            
            return (
              <div className="text-center">
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                  Restaurant Portal
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {isLoading ? "Verifying restaurant access..." : "Authentication successful. Checking access..."}
                </p>
                {isLoading && (
                  <div className="mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                )}
                
                {!debugInfo && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        const restaurantId = sessionStorage.getItem('restaurantId');
                        const staffRole = sessionStorage.getItem('staffRole');
                        const restaurantName = sessionStorage.getItem('restaurantName');
                        setDebugInfo(`Session data:\nrestaurantId: ${restaurantId}\nstaffRole: ${staffRole}\nrestaurantName: ${restaurantName}\nRender count: ${renderCountRef.current}`);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                    >
                      Show Debug Info
                    </button>
                  </div>
                )}
                
                {debugInfo && (
                  <div className="mt-6 p-4 bg-gray-100 rounded text-left text-xs">
                    <h3 className="font-bold mb-2">Debug Information:</h3>
                    <pre className="whitespace-pre-wrap">{debugInfo}</pre>
                    
                    <div className="mt-4 flex justify-between">
                      <button
                        onClick={listAllStaff}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                      >
                        Check All Staff Records
                      </button>
                      
                      <button
                        onClick={() => {
                          // Clear all session storage
                          sessionStorage.clear();
                          console.log('[LoginPage] Session storage cleared');
                          setDebugInfo('Session storage cleared. You can now try logging in again.');
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs"
                      >
                        Clear Session
                      </button>
                      
                      <button
                        onClick={() => signOut && signOut()}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          }}
        </Authenticator>
      </div>
    </div>
  );
} 
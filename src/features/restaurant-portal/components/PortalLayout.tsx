import { useState, useEffect, ReactNode, useMemo } from 'react';
import { signOut } from 'aws-amplify/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  ShoppingBag,
  Utensils,
  LayoutDashboard,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { portalRoutes } from '../routes';
import { RestaurantLocationProvider } from '../context/RestaurantLocationContext';
import { RestaurantProvider } from '../context/RestaurantContext';
import { LocationSelector } from './LocationSelector';

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard className="h-5 w-5" />,
  ShoppingBag: <ShoppingBag className="h-5 w-5" />,
  Utensils: <Utensils className="h-5 w-5" />,
  BarChart: <BarChart className="h-5 w-5" />,
  Settings: <Settings className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />
};

interface PortalLayoutProps {
  children: ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get current path from location
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  useEffect(() => {
    // Set the restaurant name from session storage
    const storedName = sessionStorage.getItem('restaurantName');
    if (storedName) {
      setRestaurantName(storedName);
    }
  }, []);

  const handleNavigation = (path: string) => {
    navigate(`/portal/${path}`);
  };

  const handleSignOut = async () => {
    try {
      // Clear all session storage data first
      sessionStorage.clear();
      
      // Sign out from AWS Amplify
      await signOut();
      
      // Redirect to login page after signout
      navigate('/portal/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if signOut fails, clear session data and redirect
      sessionStorage.clear();
      navigate('/portal/login');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Memoize the content to prevent re-renders
  const layoutContent = useMemo(() => (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div 
        className={`bg-white shadow-md transition-all duration-300 flex flex-col ${
          isSidebarOpen ? 'w-64' : 'w-30'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {isSidebarOpen ? (
            <h1 className="font-bold text-lg truncate">{restaurantName || 'Restaurant Portal'}</h1>
          ) : (
            <div className="w-full flex justify-center">
              <div className="bg-blue-100 text-blue-800 rounded-full h-10 w-10 flex items-center justify-center">
                {restaurantName ? restaurantName.charAt(0).toUpperCase() : 'R'}
              </div>
            </div>
          )}
          <button 
            onClick={toggleSidebar}
            className="text-black hover:text-black focus:outline-none"
          >
            {isSidebarOpen ? (
              <ChevronLeft className="h-5 w-5 text-black" />
            ) : (
              <ChevronRight className="h-5 w-5 text-black" />
            )}
          </button>
        </div>

        {/* Location Selector - Only show when sidebar is open */}
        {isSidebarOpen && <LocationSelector />}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-2">
            {portalRoutes.map((route) => (
              <li key={route.path}>
                <button
                  onClick={() => handleNavigation(route.path)}
                  className={`flex items-center p-2 rounded-lg w-full text-left ${
                    currentPath === route.path
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${!isSidebarOpen ? 'justify-center' : ''}`}
                >
                  {iconMap[route.icon]}
                  {isSidebarOpen && <span className="ml-3">{route.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <Button 
            variant="outline" 
            className={`w-full ${!isSidebarOpen ? 'justify-center p-2' : ''}`} 
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            {isSidebarOpen && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  ), [children, restaurantName, isSidebarOpen, currentPath]);

  return (
    <RestaurantProvider>
      <RestaurantLocationProvider>
        {layoutContent}
      </RestaurantLocationProvider>
    </RestaurantProvider>
  );
} 
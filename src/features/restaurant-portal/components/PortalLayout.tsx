import { useState, useEffect, ReactNode } from 'react';
import { signOut } from 'aws-amplify/auth';
import {
  BarChart,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  ShoppingBag,
  Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { portalRoutes, getDefaultRoute } from '../routes';

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  ShoppingBag: <ShoppingBag className="h-5 w-5" />,
  Utensils: <Utensils className="h-5 w-5" />,
  BarChart: <BarChart className="h-5 w-5" />,
  Settings: <Settings className="h-5 w-5" />
};

interface PortalLayoutProps {
  children: ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [restaurantName, setRestaurantName] = useState<string>('');

  useEffect(() => {
    // Initialize with default route if no route is in the URL
    const hash = window.location.hash.substring(1);
    const initialPath = hash || getDefaultRoute();
    setCurrentPath(initialPath);
    
    // Set the restaurant name from session storage
    const storedName = sessionStorage.getItem('restaurantName');
    if (storedName) {
      setRestaurantName(storedName);
    }

    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash.substring(1);
      if (newHash) {
        setCurrentPath(newHash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigation = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Redirect to login page after signout
      window.location.href = '/portal/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Find the current route object
  const currentRoute = portalRoutes.find(route => route.path === currentPath) || portalRoutes[0];
  const CurrentComponent = currentRoute.component;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div 
        className={`bg-white shadow-md transition-all duration-300 flex flex-col ${
          isSidebarOpen ? 'w-64' : 'w-20'
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
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {isSidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-2">
            {portalRoutes.map((route) => (
              <li key={route.path}>
                <a
                  href={`#${route.path}`}
                  onClick={() => handleNavigation(route.path)}
                  className={`flex items-center p-2 rounded-lg ${
                    currentPath === route.path
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${!isSidebarOpen ? 'justify-center' : ''}`}
                >
                  {iconMap[route.icon]}
                  {isSidebarOpen && <span className="ml-3">{route.label}</span>}
                </a>
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
  );
} 
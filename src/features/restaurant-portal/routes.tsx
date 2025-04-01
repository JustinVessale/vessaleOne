import { OrdersPage } from './components/OrdersPage';
import { MenuPage } from './components/MenuPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { AccountPage } from './components/AccountPage';

// Define the available routes for the restaurant portal
export const portalRoutes = [
  {
    path: 'orders',
    component: OrdersPage,
    label: 'Orders',
    icon: 'ShoppingBag',
    isDefault: true,
  },
  {
    path: 'menu',
    component: MenuPage,
    label: 'Menu',
    icon: 'Utensils',
    isDefault: false,
  },
  {
    path: 'analytics',
    component: AnalyticsPage,
    label: 'Analytics',
    icon: 'BarChart',
    isDefault: false,
  },
  {
    path: 'account',
    component: AccountPage,
    label: 'Account',
    icon: 'Settings',
    isDefault: false,
  },
];

// Helper to get the default route
export const getDefaultRoute = () => {
  const defaultRoute = portalRoutes.find(route => route.isDefault);
  return defaultRoute ? defaultRoute.path : 'orders';
};

// Get a route by path
export const getRouteByPath = (path: string) => {
  return portalRoutes.find(route => route.path === path) || portalRoutes[0];
}; 
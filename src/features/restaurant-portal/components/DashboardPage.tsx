import { useState, useEffect } from 'react';
import { BarChart3, Users, Utensils, DollarSign } from 'lucide-react';

// Sample dashboard card component
function DashboardCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  description: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
          <p className="text-2xl font-semibold mt-1">{value}</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          {icon}
        </div>
      </div>
      <p className="text-gray-600 text-sm mt-4">{description}</p>
      {trend && (
        <div className={`mt-2 text-sm flex items-center ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
          <span className="ml-1">{trend.label}</span>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const [staffName, setStaffName] = useState<string>('');
  const [restaurantName, setRestaurantName] = useState<string>('');

  useEffect(() => {
    // Get staff and restaurant information from session storage
    const storedStaffName = sessionStorage.getItem('staffName') || '';
    const storedRestaurantName = sessionStorage.getItem('restaurantName') || '';
    
    setStaffName(storedStaffName);
    setRestaurantName(storedRestaurantName);
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome{staffName ? `, ${staffName}` : ''} to the {restaurantName || 'restaurant'} portal
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard 
          title="Today's Orders" 
          value="24" 
          icon={<BarChart3 className="h-6 w-6 text-blue-600" />}
          description="Total orders received today"
          trend={{ value: 12, label: "from yesterday" }}
        />
        <DashboardCard 
          title="Active Customers" 
          value="156" 
          icon={<Users className="h-6 w-6 text-blue-600" />}
          description="Customers who ordered this week"
          trend={{ value: 5, label: "from last week" }}
        />
        <DashboardCard 
          title="Menu Items" 
          value="48" 
          icon={<Utensils className="h-6 w-6 text-blue-600" />}
          description="Active items on your menu"
        />
        <DashboardCard 
          title="Revenue" 
          value="$1,423" 
          icon={<DollarSign className="h-6 w-6 text-blue-600" />}
          description="Total revenue today"
          trend={{ value: -3, label: "from yesterday" }}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { id: 'ORD-1234', customer: 'Michael Johnson', time: '10:23 AM', status: 'Completed', total: '$42.50' },
                { id: 'ORD-1235', customer: 'Sarah Williams', time: '11:05 AM', status: 'In Progress', total: '$24.75' },
                { id: 'ORD-1236', customer: 'James Brown', time: '11:43 AM', status: 'New', total: '$36.20' },
                { id: 'ORD-1237', customer: 'Emma Davis', time: '12:12 PM', status: 'New', total: '$18.90' },
              ].map((order, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{order.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                        order.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-blue-100 text-blue-800'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Popular Items</h2>
        <div className="space-y-4">
          {[
            { name: 'Chicken Parmesan', orders: 42, revenue: '$546.00' },
            { name: 'Caesar Salad', orders: 38, revenue: '$342.00' },
            { name: 'Margherita Pizza', orders: 31, revenue: '$403.00' },
            { name: 'Chocolate Brownie', orders: 28, revenue: '$140.00' },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.orders} orders</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{item.revenue}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
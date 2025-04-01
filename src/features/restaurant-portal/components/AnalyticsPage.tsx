import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';
import { Loader2, DollarSign, ShoppingBag, Utensils, TrendingUp } from 'lucide-react';

const client = generateClient<Schema>();

export function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    topSellingItems: [] as { name: string; count: number }[],
  });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const restaurantId = sessionStorage.getItem('restaurantId');
        if (!restaurantId) return;

        // Fetch orders
        const { data: orders } = await client.models.Order.list({
          filter: {
            restaurantId: { eq: restaurantId },
            status: { ne: 'CANCELLED' }
          },
          selectionSet: ['id', 'total', 'items.menuItem.id', 'items.menuItem.name', 'items.quantity']
        });

        // Calculate stats
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

        // Calculate top selling items
        const itemCounts: Record<string, { name: string; count: number }> = {};
        
        orders.forEach(order => {
          order.items?.forEach((item: any) => {
            const itemId = item.menuItem?.id;
            const itemName = item.menuItem?.name;
            
            if (itemId && itemName) {
              if (!itemCounts[itemId]) {
                itemCounts[itemId] = { name: itemName, count: 0 };
              }
              itemCounts[itemId].count += (item.quantity || 1);
            }
          });
        });
        
        const topSellingItems = Object.values(itemCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats({
          totalOrders: orders.length,
          totalRevenue,
          avgOrderValue,
          topSellingItems,
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Orders Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Orders</p>
              <h3 className="text-2xl font-bold">{stats.totalOrders}</h3>
            </div>
          </div>
        </div>
        
        {/* Revenue Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
              <h3 className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        
        {/* Average Order Value Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Average Order</p>
              <h3 className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</h3>
            </div>
          </div>
        </div>
      </div>
      
      {/* Top Selling Items */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Utensils className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold">Top Selling Items</h2>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {stats.topSellingItems.length > 0 ? (
            stats.topSellingItems.map((item, index) => (
              <div key={index} className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <span className="font-medium text-gray-600">{index + 1}</span>
                  </div>
                  <span className="font-medium">{item.name}</span>
                </div>
                <div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {item.count} sold
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No order data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
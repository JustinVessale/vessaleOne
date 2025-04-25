import { useState } from 'react';
import { BarChart, LineChart, PieChart, Calendar, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Sample analytics card component
function AnalyticsCard({ 
  title, 
  value, 
  change, 
  timeframe,
  icon
}: { 
  title: string; 
  value: string; 
  change: number;
  timeframe: string;
  icon: React.ReactNode;
}) {
  const isPositive = change > 0;
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <div className="flex items-center mt-2">
            <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
              {Math.abs(change)}%
            </span>
            <span className="text-gray-500 text-sm ml-1">vs. {timeframe}</span>
          </div>
        </div>
        <div className="p-3 bg-blue-50 rounded-full">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState('week');
  
  return (
    <div>
      <div className="bg-amber-100 border border-amber-300 rounded-md p-4 mb-6 flex items-center">
        <AlertTriangle className="h-6 w-6 text-amber-500 mr-3" />
        <p className="text-amber-800 font-medium">Placeholder data, component coming soon</p>
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Insights and performance metrics for your restaurant</p>
      </div>
      
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-md">
          <Button 
            variant={timeframe === 'day' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setTimeframe('day')}
          >
            Today
          </Button>
          <Button 
            variant={timeframe === 'week' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setTimeframe('week')}
          >
            This Week
          </Button>
          <Button 
            variant={timeframe === 'month' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setTimeframe('month')}
          >
            This Month
          </Button>
          <Button 
            variant={timeframe === 'year' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setTimeframe('year')}
          >
            This Year
          </Button>
        </div>
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
          <span className="text-sm text-gray-700">Custom Range</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AnalyticsCard 
          title="Total Revenue" 
          value="$14,452"
          change={8.2}
          timeframe="last week"
          icon={<LineChart className="h-6 w-6 text-blue-600" />}
        />
        <AnalyticsCard 
          title="Total Orders" 
          value="432"
          change={-2.5}
          timeframe="last week"
          icon={<BarChart className="h-6 w-6 text-blue-600" />}
        />
        <AnalyticsCard 
          title="Average Order Value" 
          value="$33.45"
          change={12.3}
          timeframe="last week"
          icon={<PieChart className="h-6 w-6 text-blue-600" />}
        />
        <AnalyticsCard 
          title="New Customers" 
          value="52"
          change={5.1}
          timeframe="last week"
          icon={<LineChart className="h-6 w-6 text-blue-600" />}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Trend</h2>
          <div className="aspect-[1.6/1] bg-gray-100 rounded-md flex items-center justify-center">
            <p className="text-gray-500">Revenue chart visualization (mock)</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Orders by Day</h2>
          <div className="aspect-[1.6/1] bg-gray-100 rounded-md flex items-center justify-center">
            <p className="text-gray-500">Orders chart visualization (mock)</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Selling Items</h2>
          <div className="space-y-4">
            {[
              { name: 'Chicken Parmesan', orders: 42, revenue: '$546.00', percent: 85 },
              { name: 'Caesar Salad', orders: 38, revenue: '$342.00', percent: 75 },
              { name: 'Margherita Pizza', orders: 31, revenue: '$403.00', percent: 62 },
              { name: 'Chocolate Brownie', orders: 28, revenue: '$140.00', percent: 55 },
              { name: 'Grilled Salmon', orders: 24, revenue: '$528.00', percent: 48 },
            ].map((item, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{item.name}</span>
                  <span>{item.revenue}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${item.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Order Breakdown</h2>
          <div className="mb-6 aspect-square max-w-[240px] mx-auto bg-gray-100 rounded-full flex items-center justify-center">
            <p className="text-gray-500">Pie chart visualization (mock)</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center mb-1">
                <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
                <span className="font-medium">Dine-in</span>
              </div>
              <p className="text-gray-500">45% (194 orders)</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center mb-1">
                <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                <span className="font-medium">Pickup</span>
              </div>
              <p className="text-gray-500">30% (129 orders)</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center mb-1">
                <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
                <span className="font-medium">Delivery</span>
              </div>
              <p className="text-gray-500">25% (109 orders)</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center mb-1">
                <div className="h-3 w-3 rounded-full bg-purple-500 mr-2"></div>
                <span className="font-medium">Online</span>
              </div>
              <p className="text-gray-500">55% (237 orders)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
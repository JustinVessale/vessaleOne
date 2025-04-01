import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient<Schema>();

export function AccountPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [printerSettings, setPrinterSettings] = useState({
    printerType: '',
    ipAddress: '',
    port: 0,
    isEnabled: false
  });
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        // Get the current user email
        const user = await getCurrentUser();
        setCurrentUserEmail(user.username);
        
        const restaurantId = sessionStorage.getItem('restaurantId');
        if (!restaurantId) return;

        // Fetch restaurant details
        const { data: restaurantData } = await client.models.Restaurant.get({
          id: restaurantId
        });

        if (!restaurantData) {
          throw new Error('Restaurant not found');
        }

        setRestaurant(restaurantData);
        
        // Set printer settings from restaurant data
        if (restaurantData.printerConfig) {
          setPrinterSettings({
            printerType: restaurantData.printerConfig.printerType || '',
            ipAddress: restaurantData.printerConfig.ipAddress || '',
            port: restaurantData.printerConfig.port || 0,
            isEnabled: restaurantData.printerConfig.isEnabled || false
          });
        }

        // Fetch staff members
        const { data: staffData } = await client.models.RestaurantStaff.list({
          filter: {
            restaurantId: { eq: restaurantId }
          },
          selectionSet: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive']
        });

        setStaffMembers(staffData);
      } catch (error) {
        console.error('Error fetching account data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountData();
  }, []);

  const handlePrinterSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setPrinterSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const savePrinterSettings = async () => {
    if (!restaurant) return;
    
    setIsSaving(true);
    try {
      await client.models.Restaurant.update({
        id: restaurant.id,
        printerConfig: {
          printerType: printerSettings.printerType,
          ipAddress: printerSettings.ipAddress,
          port: parseInt(printerSettings.port.toString()),
          isEnabled: printerSettings.isEnabled
        }
      });
      
      // Update local state
      setRestaurant(prev => ({
        ...prev,
        printerConfig: { ...printerSettings }
      }));
      
      alert('Printer settings saved successfully');
    } catch (error) {
      console.error('Error saving printer settings:', error);
      alert('Failed to save printer settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'STAFF':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restaurant Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Restaurant Details</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Restaurant Name</p>
              <p className="mt-1">{restaurant?.name}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Address</p>
              <p className="mt-1">
                {restaurant?.address}<br />
                {restaurant?.city}, {restaurant?.state} {restaurant?.zip}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="mt-1">{restaurant?.phone}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Owner Email</p>
              <p className="mt-1">{restaurant?.ownerEmail}</p>
            </div>
          </div>
        </div>
        
        {/* Printer Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Printer Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Printer Type</label>
              <input
                type="text"
                name="printerType"
                value={printerSettings.printerType}
                onChange={handlePrinterSettingsChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">IP Address</label>
              <input
                type="text"
                name="ipAddress"
                value={printerSettings.ipAddress}
                onChange={handlePrinterSettingsChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Port</label>
              <input
                type="number"
                name="port"
                value={printerSettings.port}
                onChange={handlePrinterSettingsChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isEnabled"
                name="isEnabled"
                checked={printerSettings.isEnabled}
                onChange={handlePrinterSettingsChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isEnabled" className="ml-2 block text-sm text-gray-700">
                Enable Printer
              </label>
            </div>
            
            <Button 
              onClick={savePrinterSettings} 
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Staff Management */}
      <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Staff Management</h2>
            <Button>Add Staff Member</Button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {staffMembers.length > 0 ? (
            staffMembers.map((staff) => (
              <div key={staff.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <div className="mr-3 font-medium">
                      {staff.firstName} {staff.lastName}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(staff.role)}`}>
                      {staff.role}
                    </span>
                    {staff.email === currentUserEmail && (
                      <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{staff.email}</div>
                </div>
                
                {staff.role !== 'OWNER' && (
                  <div>
                    <Button variant="outline" size="sm" disabled={staff.email === currentUserEmail}>
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No staff members found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../../../amplify/data/resource';
import { Loader2, User, Building, Mail, Phone, MapPin, Clock, Upload, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorageImage } from '@/components/ui/s3-image';
import { BusinessHoursEditor } from './BusinessHoursEditor';
import { useToast } from '@/hooks/use-toast';
import { BusinessHours } from '@/utils/business-hours';

const client = generateClient<Schema>();

// Sample restaurant account data
const sampleRestaurant = {
  id: 'rest123',
  name: 'Pizzeria Napoli',
  description: 'Authentic Italian pizzas made with fresh ingredients and traditional techniques.',
  address: '123 Main Street, Anytown, USA',
  email: 'info@pizzerianapoli.com',
  phone: '(555) 123-4567',
  website: 'pizzerianapoli.com',
  openingHours: [
    { day: 'Monday', hours: '11:00 AM - 10:00 PM' },
    { day: 'Tuesday', hours: '11:00 AM - 10:00 PM' },
    { day: 'Wednesday', hours: '11:00 AM - 10:00 PM' },
    { day: 'Thursday', hours: '11:00 AM - 10:00 PM' },
    { day: 'Friday', hours: '11:00 AM - 11:00 PM' },
    { day: 'Saturday', hours: '11:00 AM - 11:00 PM' },
    { day: 'Sunday', hours: '12:00 PM - 9:00 PM' }
  ],
  logo: 'https://source.unsplash.com/random/200x200?pizza',
  banner: 'https://source.unsplash.com/random/1000x300?pizza',
  cuisine: 'Italian',
  isActive: true
};

// Sample staff data
const sampleStaff = {
  id: 'staff123',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  role: 'Manager',
  phone: '(555) 987-6543'
};

interface FormField {
  label: string;
  key: string;
  value: string;
  type: 'text' | 'email' | 'tel' | 'textarea';
  icon: React.ReactNode;
}

export function AccountPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [restaurant, setRestaurant] = useState(sampleRestaurant);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [printerSettings, setPrinterSettings] = useState({
    printerType: '',
    ipAddress: '',
    port: 0,
    isEnabled: false
  });
  //const [staffMembers, setStaffMembers] = useState<any[]>([]);
  //const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('restaurant');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        // Get the current user email
        //const user = await getCurrentUser();
        //setCurrentUserEmail(user.username);
        
        const restaurantId = sessionStorage.getItem('restaurantId');
        if (!restaurantId) return;

        // Fetch restaurant details
        const { data: restaurantData } = await client.models.Restaurant.get({
          id: restaurantId
        });

        if (!restaurantData) {
          throw new Error('Restaurant not found');
        }
        
        setRestaurantData(restaurantData);
        
        // Fetch business hours
        const { data: businessHoursData } = await client.models.BusinessHours.list({
          filter: { restaurantId: { eq: restaurantId } },
          selectionSet: ['id', 'restaurantId', 'locationId', 'dayOfWeek', 'isOpen', 'openTime', 'closeTime']
        });
        
        // Map Amplify data to our BusinessHours interface
        const mappedBusinessHours: BusinessHours[] = (businessHoursData || []).map(hours => ({
          id: hours.id,
          restaurantId: hours.restaurantId || '',
          locationId: hours.locationId || undefined,
          dayOfWeek: hours.dayOfWeek || 0,
          isOpen: hours.isOpen || false,
          openTime: hours.openTime || '11:00',
          closeTime: hours.closeTime || '21:00'
        }));
        
        setBusinessHours(mappedBusinessHours);
        
        // Create a new restaurant object that matches the expected structure
        const restaurantForState = {
          id: restaurantData.id,
          name: restaurantData.name || '',
          description: restaurantData.description || '',
          address: restaurantData.address || '',
          email: '',
          phone: restaurantData.phone || '',
          website: '',
          openingHours: sampleRestaurant.openingHours,
          logo: '',
          banner: '',
          cuisine: '',
          isActive: false
        };
        
        setRestaurant(restaurantForState);
        
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

        //setStaffMembers(staffData);
        console.log('staffData', staffData);
      } catch (error) {
        console.error('Error fetching account data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountData();
  }, []);

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
      
      toast({
        title: "Success",
        description: "Printer settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving printer settings:', error);
      toast({
        title: "Error",
        description: "Failed to save printer settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBusinessHours = async (timezone: string, businessHours: BusinessHours[]) => {
    if (!restaurantData) return;
    
    try {
      // Update restaurant timezone
      await client.models.Restaurant.update({
        id: restaurantData.id,
        timezone
      });
      
      // Update local state
      setRestaurantData((prev: any) => ({
        ...prev,
        timezone
      }));
      
      setBusinessHours(businessHours);
      
      toast({
        title: "Success",
        description: "Business hours saved successfully",
      });
    } catch (error) {
      console.error('Error saving business hours:', error);
      toast({
        title: "Error",
        description: "Failed to save business hours",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes
      if (activeTab === 'restaurant') {
        setRestaurant({ ...restaurant, ...formData });
      } else {
        // Placeholder for staff update
      }
    } else {
      // Start editing - initialize form data
      setFormData(activeTab === 'restaurant' ? restaurant : sampleStaff);
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const restaurantFields: FormField[] = [
    { label: 'Restaurant Name', key: 'name', value: restaurant.name, type: 'text', icon: <Building className="h-5 w-5 text-gray-400" /> },
    { label: 'Description', key: 'description', value: restaurant.description, type: 'textarea', icon: <Building className="h-5 w-5 text-gray-400" /> },
    { label: 'Email', key: 'email', value: restaurant.email, type: 'email', icon: <Mail className="h-5 w-5 text-gray-400" /> },
    { label: 'Phone', key: 'phone', value: restaurant.phone, type: 'tel', icon: <Phone className="h-5 w-5 text-gray-400" /> },
    { label: 'Address', key: 'address', value: restaurant.address, type: 'text', icon: <MapPin className="h-5 w-5 text-gray-400" /> },
    { label: 'Website', key: 'website', value: restaurant.website, type: 'text', icon: <Building className="h-5 w-5 text-gray-400" /> }
  ];

  const staffFields: FormField[] = [
    { label: 'First Name', key: 'firstName', value: sampleStaff.firstName, type: 'text', icon: <User className="h-5 w-5 text-gray-400" /> },
    { label: 'Last Name', key: 'lastName', value: sampleStaff.lastName, type: 'text', icon: <User className="h-5 w-5 text-gray-400" /> },
    { label: 'Email', key: 'email', value: sampleStaff.email, type: 'email', icon: <Mail className="h-5 w-5 text-gray-400" /> },
    { label: 'Phone', key: 'phone', value: sampleStaff.phone, type: 'tel', icon: <Phone className="h-5 w-5 text-gray-400" /> },
    { label: 'Role', key: 'role', value: sampleStaff.role, type: 'text', icon: <Building className="h-5 w-5 text-gray-400" /> }
  ];

  const currentFields = activeTab === 'restaurant' ? restaurantFields : staffFields;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Account</h1>
        <p className="text-gray-600 mt-1">Manage your restaurant and staff information</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-1 border-b">
          <div className="flex">
            <button
              className={`px-4 py-2 rounded-md ${activeTab === 'restaurant' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('restaurant')}
            >
              Restaurant Details
            </button>
            <button
              className={`px-4 py-2 rounded-md ${activeTab === 'hours' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('hours')}
            >
              Business Hours
            </button>
            <button
              className={`px-4 py-2 rounded-md ${activeTab === 'staff' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('staff')}
            >
              Staff Profile
            </button>
          </div>
        </div>

        {activeTab === 'restaurant' && (
          <div className="p-6">
            {restaurant.banner && (
              <div className="mb-6 relative">
                <StorageImage
                  src={restaurant.banner}
                  alt={restaurant.name}
                  className="w-full h-40 object-cover rounded-md"
                />
                {isEditing && (
                  <div className="absolute bottom-3 right-3 flex space-x-2">
                    <button className="p-2 bg-white rounded-full shadow-md">
                      <Upload className="h-4 w-4 text-gray-600" />
                    </button>
                    <button className="p-2 bg-white rounded-full shadow-md">
                      <Trash className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-4 mb-6">
              {restaurant.logo && (
                <div className="relative">
                  <StorageImage
                    src={restaurant.logo}
                    alt={restaurant.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-md">
                      <Upload className="h-3 w-3 text-gray-600" />
                    </button>
                  )}
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold">{restaurant.name}</h2>
                <p className="text-sm text-gray-500">ID: {restaurant.id}</p>
              </div>
            </div>

            <div className="space-y-4">
              {currentFields.map((field) => (
                <div key={field.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="flex items-center">
                    {field.icon}
                    <label className="block text-sm font-medium text-gray-700 ml-2">
                      {field.label}
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    {isEditing ? (
                      field.type === 'textarea' ? (
                        <textarea
                          name={field.key}
                          value={formData[field.key] || ''}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          rows={3}
                        />
                      ) : (
                        <input
                          type={field.type}
                          name={field.key}
                          value={formData[field.key] || ''}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      )
                    ) : (
                      <p className="text-gray-900">{field.value}</p>
                    )}
                  </div>
                </div>
              ))}

              {activeTab === 'restaurant' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <label className="block text-sm font-medium text-gray-700 ml-2">
                      Opening Hours
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    {restaurant.openingHours.map((schedule, index) => (
                      <div key={index} className="flex justify-between mb-1 text-sm">
                        <span className="font-medium w-24">{schedule.day}</span>
                        <span>{schedule.hours}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'hours' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Business Hours</h2>
              <p className="text-gray-600">Set your restaurant's operating hours and timezone</p>
            </div>
            
            {restaurantData && (
              <BusinessHoursEditor
                timezone={restaurantData.timezone || 'America/Los_Angeles'}
                businessHours={businessHours}
                restaurantId={restaurantData.id}
                onSave={handleSaveBusinessHours}
                isLoading={isLoading}
              />
            )}
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-semibold">
                {sampleStaff.firstName.charAt(0)}{sampleStaff.lastName.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{sampleStaff.firstName} {sampleStaff.lastName}</h2>
                <p className="text-sm text-gray-500">{sampleStaff.role}</p>
              </div>
            </div>

            <div className="space-y-4">
              {currentFields.map((field) => (
                <div key={field.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="flex items-center">
                    {field.icon}
                    <label className="block text-sm font-medium text-gray-700 ml-2">
                      {field.label}
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    {isEditing ? (
                      <input
                        type={field.type}
                        name={field.key}
                        value={formData[field.key] || ''}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <p className="text-gray-900">{field.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'restaurant' && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={handleEditToggle}
            >
              {isEditing ? "Save Changes" : "Edit Profile"}
            </Button>
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <Button 
            onClick={savePrinterSettings} 
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
} 
import { useState } from 'react';
import { NashDeliveryAddress, NashContact } from '@/lib/services/nashService';

export interface DeliveryFormData {
  address: NashDeliveryAddress;
  contact: NashContact;
}

interface DeliveryFormProps {
  onSubmit: (data: DeliveryFormData) => void;
  isLoading?: boolean;
}

export function DeliveryForm({ onSubmit, isLoading = false }: DeliveryFormProps) {
  const [formData, setFormData] = useState<DeliveryFormData>({
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      instructions: '',
    },
    contact: {
      name: '',
      phone: '',
      email: '',
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value,
        },
      });
    } else if (name.startsWith('contact.')) {
      const contactField = name.split('.')[1];
      setFormData({
        ...formData,
        contact: {
          ...formData.contact,
          [contactField]: value,
        },
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Common input class with increased height
  const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-base py-2.5 px-3";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Delivery Information</h3>
        
        {/* Contact Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Contact Information</h4>
          
          <div>
            <label htmlFor="contact.name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              id="contact.name"
              name="contact.name"
              value={formData.contact.name}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          
          <div>
            <label htmlFor="contact.phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              id="contact.phone"
              name="contact.phone"
              value={formData.contact.phone}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          
          <div>
            <label htmlFor="contact.email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="contact.email"
              name="contact.email"
              value={formData.contact.email}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>
        
        {/* Address Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Delivery Address</h4>
          
          <div>
            <label htmlFor="address.street" className="block text-sm font-medium text-gray-700">
              Street Address
            </label>
            <input
              type="text"
              id="address.street"
              name="address.street"
              value={formData.address.street}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="address.city" className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                id="address.city"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
            
            <div>
              <label htmlFor="address.state" className="block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                type="text"
                id="address.state"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="address.zip" className="block text-sm font-medium text-gray-700">
              ZIP Code
            </label>
            <input
              type="text"
              id="address.zip"
              name="address.zip"
              value={formData.address.zip}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          
          <div>
            <label htmlFor="address.instructions" className="block text-sm font-medium text-gray-700">
              Delivery Instructions (optional)
            </label>
            <textarea
              id="address.instructions"
              name="address.instructions"
              value={formData.address.instructions}
              onChange={handleChange}
              rows={2}
              className={`${inputClass} min-h-[80px]`}
              placeholder="Apartment number, gate code, etc."
            />
          </div>
        </div>
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-3.5 px-4 border border-primary-700 rounded-lg shadow-sm text-base font-medium text-black bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors mt-6"
      >
        {isLoading ? 'Processing...' : 'Continue to Payment'}
      </button>
    </form>
  );
} 
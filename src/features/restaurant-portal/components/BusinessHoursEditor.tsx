import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Clock, Save, X } from 'lucide-react';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { 
  BusinessHours, 
  DAYS_OF_WEEK, 
  TIMEZONE_OPTIONS,
  formatTimeForDisplay,
  parseTimeFromDisplay,
  createDefaultBusinessHours
} from '@/utils/business-hours';

const client = generateClient<Schema>();

interface BusinessHoursEditorProps {
  timezone: string;
  businessHours: BusinessHours[];
  restaurantId: string;
  locationId?: string;
  onSave: (timezone: string, businessHours: BusinessHours[]) => Promise<void>;
  isLoading?: boolean;
}

export function BusinessHoursEditor({ 
  timezone, 
  businessHours, 
  restaurantId,
  locationId,
  onSave, 
  isLoading = false 
}: BusinessHoursEditorProps) {
  const [selectedTimezone, setSelectedTimezone] = useState(timezone || 'America/Los_Angeles');
  const [hoursData, setHoursData] = useState<BusinessHours[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (businessHours.length === 0) {
      // Initialize with default hours if none exist
      const defaultHours = createDefaultBusinessHours(restaurantId, locationId);
      setHoursData(defaultHours.map((hours, index) => ({
        ...hours,
        id: `temp-${index}` // Temporary ID for new records
      })));
    } else {
      setHoursData(businessHours);
    }
  }, [businessHours, restaurantId, locationId]);

  const handleDayToggle = (dayIndex: number, isOpen: boolean) => {
    setHoursData(prev => prev.map(hours => 
      hours.dayOfWeek === dayIndex 
        ? { ...hours, isOpen }
        : hours
    ));
  };

  const handleTimeChange = (dayIndex: number, field: 'openTime' | 'closeTime', value: string) => {
    setHoursData(prev => prev.map(hours => 
      hours.dayOfWeek === dayIndex 
        ? { ...hours, [field]: parseTimeFromDisplay(value) }
        : hours
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete existing business hours
      if (businessHours.length > 0) {
        await Promise.all(
          businessHours.map(hours => 
            client.models.BusinessHours.delete({ id: hours.id })
          )
        );
      }

      // Create new business hours
      const newHoursData = hoursData.map(hours => ({
        restaurantId: hours.restaurantId,
        locationId: hours.locationId,
        dayOfWeek: hours.dayOfWeek,
        isOpen: hours.isOpen,
        openTime: hours.openTime,
        closeTime: hours.closeTime
      }));

      const createdHours = await Promise.all(
        newHoursData.map(hours => 
          client.models.BusinessHours.create(hours)
        )
      );

      await onSave(selectedTimezone, createdHours.map(h => h.data!));
    } catch (error) {
      console.error('Error saving business hours:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    const defaultHours = createDefaultBusinessHours(restaurantId, locationId);
    setHoursData(defaultHours.map((hours, index) => ({
      ...hours,
      id: `temp-${index}` // Temporary ID for new records
    })));
  };

  return (
    <div className="space-y-6">
      {/* Timezone Selection */}
      <div className="space-y-2">
        <Label htmlFor="timezone" className="text-sm font-medium">
          Timezone
        </Label>
        <select
          id="timezone"
          value={selectedTimezone}
          onChange={(e) => setSelectedTimezone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TIMEZONE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Business Hours */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Business Hours</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            disabled={isLoading || isSaving}
          >
            Reset to Default
          </Button>
        </div>

        <div className="space-y-3">
          {hoursData.map((hours) => (
            <div key={hours.dayOfWeek} className="flex items-center space-x-4 p-4 border rounded-lg">
              {/* Day Toggle */}
              <div className="flex items-center space-x-3 min-w-[120px]">
                <Switch
                  checked={hours.isOpen}
                  onCheckedChange={(checked) => handleDayToggle(hours.dayOfWeek, checked)}
                  disabled={isLoading || isSaving}
                />
                <Label className="text-sm font-medium min-w-[80px]">
                  {DAYS_OF_WEEK[hours.dayOfWeek]}
                </Label>
              </div>

              {/* Time Inputs */}
              {hours.isOpen ? (
                <div className="flex items-center space-x-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <input
                      type="time"
                      value={hours.openTime}
                      onChange={(e) => handleTimeChange(hours.dayOfWeek, 'openTime', e.target.value)}
                      disabled={isLoading || isSaving}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-gray-400">to</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={hours.closeTime}
                      onChange={(e) => handleTimeChange(hours.dayOfWeek, 'closeTime', e.target.value)}
                      disabled={isLoading || isSaving}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">
                      ({formatTimeForDisplay(hours.openTime)} - {formatTimeForDisplay(hours.closeTime)})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-gray-500">
                  <X className="h-4 w-4" />
                  <span className="text-sm">Closed</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="flex items-center space-x-2"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Hours</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 
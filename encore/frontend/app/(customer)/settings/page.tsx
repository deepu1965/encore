'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export default function SettingsGeneralPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-h3 font-bold">General Settings</h2>
      
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            defaultValue="en"
            options={[
              { value: 'en', label: 'English (US)' },
              { value: 'es', label: 'Español' },
              { value: 'fr', label: 'Français' },
            ]}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select
            defaultValue="america-los_angeles"
            options={[
              { value: 'america-los_angeles', label: 'Pacific Time (PT)' },
              { value: 'america-new_york', label: 'Eastern Time (ET)' },
              { value: 'europe-london', label: 'London (GMT)' },
            ]}
          />
        </div>
        
        <div className="pt-4 border-t">
          <Button>Save Preferences</Button>
        </div>
      </Card>
    </div>
  );
}

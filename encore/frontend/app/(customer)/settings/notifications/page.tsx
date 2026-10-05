'use client';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function SettingsNotificationsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-h3 font-bold">Notification Preferences</h2>
      
      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Order Updates</Label>
              <p className="text-sm text-muted-foreground">Receive emails about your purchases and ticket transfers.</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label className="text-base">Marketing & Promos</Label>
              <p className="text-sm text-muted-foreground">Hear about upcoming events and exclusive presales.</p>
            </div>
            <input type="checkbox" className="w-5 h-5 accent-primary" />
          </div>
        </div>
      </Card>
    </div>
  );
}

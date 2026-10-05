'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPrivacyPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-h3 font-bold">Privacy & Security</h2>
      
      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium text-lg">Change Password</h3>
            <p className="text-sm text-muted-foreground">Ensure your account is using a long, random password to stay secure.</p>
            <Button variant="outline" className="mt-2">Update Password</Button>
          </div>
          
          <div className="pt-6 border-t space-y-2">
            <h3 className="font-medium text-lg text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
            <Button variant="destructive" className="mt-2">Delete Account</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-h2 font-bold">How can we help?</h1>
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input className="pl-10 h-12" placeholder="Search for answers..." />
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 pt-8">
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Popular Topics</h2>
          <ul className="space-y-3 text-primary">
            <li><a href="#" className="hover:underline">Where are my tickets?</a></li>
            <li><a href="#" className="hover:underline">How do I transfer tickets to a friend?</a></li>
            <li><a href="#" className="hover:underline">Can I get a refund?</a></li>
            <li><a href="#" className="hover:underline">My event was cancelled. What now?</a></li>
          </ul>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Contact Support</h2>
          <p className="text-muted-foreground">Can't find what you're looking for? Our team is here to help.</p>
          <Button className="w-full">Submit a Request</Button>
        </Card>
      </div>
    </div>
  );
}

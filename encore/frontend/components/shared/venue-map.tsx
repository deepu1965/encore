'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VenueMapProps {
  lat: number;
  lng: number;
  venueName: string;
}

export function VenueMap({ lat, lng, venueName }: VenueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, we would dynamically load maplibre-gl and initialize it here
    // e.g., const map = new maplibregl.Map({ container: mapContainerRef.current, style: '...' });
  }, [lat, lng]);

  const handleGetDirections = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Calculate distance (mocked)
          setDistance('2.4 miles away (approx 10 min drive)');
        },
        (err) => {
          console.error('Location permission denied', err);
          alert('Please enable location permissions to get routing/ETA.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <Card className="overflow-hidden border flex flex-col h-full">
      <div 
        ref={mapContainerRef} 
        className="w-full h-64 bg-slate-100 flex flex-col items-center justify-center text-muted-foreground relative"
      >
        <MapPin className="w-8 h-8 text-primary mb-2 absolute" style={{ top: '45%', left: '48%' }} />
        <span className="absolute bottom-4 left-4 text-xs font-semibold bg-white/80 px-2 py-1 rounded-md shadow-sm">MapLibre GL Map</span>
      </div>
      <div className="p-4 space-y-4">
         <div>
           <h3 className="font-bold">{venueName}</h3>
           <p className="text-sm text-muted-foreground">Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
           {distance && <p className="text-sm font-medium text-success mt-1">{distance}</p>}
         </div>
         <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleGetDirections}>
           <Navigation className="w-4 h-4" /> Get Directions & ETA
         </Button>
      </div>
    </Card>
  );
}

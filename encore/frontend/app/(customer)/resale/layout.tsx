import Link from 'next/link';

export default function ResaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-muted/30 border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex gap-6 text-sm font-medium">
          <Link href="/resale" className="hover:text-primary">Marketplace</Link>
          <Link href="/resale/my-listings" className="hover:text-primary">My Listings</Link>
          <Link href="/resale/my-trades" className="hover:text-primary">My Trades</Link>
        </div>
      </div>
      <main>
        {children}
      </main>
    </div>
  );
}

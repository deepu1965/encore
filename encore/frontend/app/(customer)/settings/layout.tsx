import Link from 'next/link';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-h2 font-bold mb-8">Settings</h1>
      <div className="grid md:grid-cols-[250px_1fr] gap-8">
        <nav className="flex flex-col space-y-1">
          <Link href="/settings" className="px-4 py-2 rounded-md hover:bg-muted font-medium">
            General
          </Link>
          <Link href="/settings/notifications" className="px-4 py-2 rounded-md hover:bg-muted font-medium">
            Notifications
          </Link>
          <Link href="/settings/privacy" className="px-4 py-2 rounded-md hover:bg-muted font-medium">
            Privacy & Security
          </Link>
        </nav>
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

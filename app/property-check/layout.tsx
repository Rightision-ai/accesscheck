import Link from 'next/link';
import { getUser } from '@/lib/auth/actions';
import { redirect } from 'next/navigation';
import NavTabs from '@/app/components/property-check/NavTabs';

export default async function PropertyCheckLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-primary">
                ← Dashboard
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-base font-extrabold text-slate-900">Property Check</span>
            </div>
          </div>
          <NavTabs />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
}

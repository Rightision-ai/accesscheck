import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/actions';
import { redirect } from 'next/navigation';
import { Badge, Progress } from '@/app/components/property-check/ui';

export default async function JobsPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from('harvest_jobs')
    .select('id, original_filename, status, total_properties, processed_count, failed_count, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">Bulk Checks</h1>
        <Link
          href="/property-check/upload"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
        >
          + New Upload
        </Link>
      </div>

      {(jobs ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No property checks yet.</p>
          <Link href="/property-check/upload" className="text-sm font-bold text-primary mt-2 inline-block">
            Upload your first property list →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 w-48">Progress</th>
                <th className="px-4 py-3">Failed</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(jobs ?? []).map((j) => (
                <tr key={j.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-slate-800">{j.original_filename}</td>
                  <td className="px-4 py-3"><Badge value={j.status} /></td>
                  <td className="px-4 py-3">
                    <Progress value={j.processed_count} max={j.total_properties} />
                    <span className="text-[11px] text-slate-400 mt-1 inline-block">
                      {j.processed_count}/{j.total_properties}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{j.failed_count}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(j.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/property-check/jobs/${j.id}`} className="text-sm font-bold text-primary">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

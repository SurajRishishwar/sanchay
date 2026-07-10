import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default async function ManagerUsersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'manager') redirect('/')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name')

  const { data: memberships } = await supabase
    .from('jar_members')
    .select('user_id, jars(name)')

  const jarCountByUser = new Map<string, string[]>()
  for (const m of memberships ?? []) {
    const jar = Array.isArray(m.jars) ? m.jars[0] : m.jars
    const list = jarCountByUser.get(m.user_id) ?? []
    if (jar?.name) list.push(jar.name)
    jarCountByUser.set(m.user_id, list)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
      <Navbar isManager />
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-50">Users</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                Manage roles and Jar assignments.
              </p>
            </div>
            <Link href="/manager" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Back
            </Link>
          </div>

          {!profiles || profiles.length === 0 ? (
            <div className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-900 dark:text-zinc-400">
              No users found.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {profiles.map((p) => {
                const jarNames = jarCountByUser.get(p.id) ?? []
                return (
                  <Link
                    key={p.id}
                    href={`/manager/users/${p.id}`}
                    className="block rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:border-zinc-900 dark:bg-zinc-900 transition hover:shadow-md dark:hover:border-zinc-800"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-50">
                        {p.full_name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          p.role === 'manager'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {p.role}
                      </span>
                    </div>
                    <p className="truncate text-xs text-gray-500 dark:text-zinc-400">{p.email}</p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400 truncate">
                      {jarNames.length > 0
                        ? jarNames.join(', ')
                        : 'Not assigned to any Jar'}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
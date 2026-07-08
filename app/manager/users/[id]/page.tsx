import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import NavLinkButton from '@/components/NavLinkButton'
import UserJarAssignment from '@/components/UserJarAssingment'
import RoleToggle from '@/components/RoleToggle'

const PAGE_SIZE = 10

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id: targetUserId } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

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

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', targetUserId)
    .single()

  if (!targetProfile) notFound()

  const { data: jars } = await supabase
    .from('jars')
    .select('id, name, type')
    .order('name')

  const { data: memberships } = await supabase
    .from('jar_members')
    .select('jar_id, is_default')
    .eq('user_id', targetUserId)

  const { data: expenses, count: expenseCount } = await supabase
    .from('expenses')
    .select('id, amount, category_name, entry_date, jar_id', { count: 'exact' })
    .eq('user_id', targetUserId)
    .order('entry_date', { ascending: false })
    .range(from, to)

  const jarNameById = new Map((jars ?? []).map((j) => [j.id, j.name]))
  const totalPages = Math.max(1, Math.ceil((expenseCount ?? 0) / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isManager />
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-gray-900">
                {targetProfile.full_name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{targetProfile.email}</p>
            </div>
            <Link href="/manager/users" className="text-sm font-medium text-blue-600">
              Back
            </Link>
          </div>

          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-900">Role</p>
            <RoleToggle
              userId={targetProfile.id}
              currentRole={targetProfile.role}
              isSelf={targetProfile.id === user.id}
            />
          </div>

          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-900">Jar assignment</p>
            <UserJarAssignment
              targetUserId={targetProfile.id}
              jars={jars ?? []}
              initialMemberships={memberships ?? []}
            />
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-900">Expenses</p>

            {expenses && expenses.length > 0 ? (
              <div className="space-y-2">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-900">{e.category_name}</p>
                      <p className="text-xs text-gray-500">
                        {jarNameById.get(e.jar_id) ?? 'Unknown Jar'} ·{' '}
                        {new Date(e.entry_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900">
                      ₹{Number(e.amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No expenses logged yet.</p>
            )}

            {expenseCount !== null && expenseCount > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <NavLinkButton
                  href={`?page=${page - 1}`}
                  className={`text-sm font-medium ${
                    page <= 1 ? 'pointer-events-none text-gray-300' : 'text-blue-600'
                  }`}
                >
                  Previous
                </NavLinkButton>
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <NavLinkButton
                  href={`?page=${page + 1}`}
                  className={`text-sm font-medium ${
                    page >= totalPages ? 'pointer-events-none text-gray-300' : 'text-blue-600'
                  }`}
                >
                  Next
                </NavLinkButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
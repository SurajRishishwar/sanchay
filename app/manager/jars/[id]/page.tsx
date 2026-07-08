import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import NavLinkButton from '@/components/NavLinkButton'

const PAGE_SIZE = 10

export default async function JarDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id: jarId } = await params
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

  const { data: jar } = await supabase
    .from('jars')
    .select('id, name, type, budget_amount')
    .eq('id', jarId)
    .single()

  if (!jar) notFound()

  // Spend so far — Ongoing Jars scoped to the current month,
  // Event Jars counted since the Jar was created.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  let expensesQuery = supabase
    .from('expenses')
    .select('id, amount, category_name, user_name, entry_date', { count: 'exact' })
    .eq('jar_id', jarId)
    .order('entry_date', { ascending: false })
    .range(from, to)

  if (jar.type === 'ongoing') {
    expensesQuery = expensesQuery.gte('entry_date', monthStart)
  }

  const { data: recentExpenses, count: expenseCount } = await expensesQuery
  const totalPages = Math.max(1, Math.ceil((expenseCount ?? 0) / PAGE_SIZE))

  let totalQuery = supabase
    .from('expenses')
    .select('amount')
    .eq('jar_id', jarId)

  if (jar.type === 'ongoing') {
    totalQuery = totalQuery.gte('entry_date', monthStart)
  }

  const { data: allExpenses } = await totalQuery
  const spent = (allExpenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)
  const remaining = jar.budget_amount - spent
  const isOver = remaining < 0

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('jar_id', jarId)
    .order('created_at')

  const { data: members } = await supabase
    .from('jar_members')
    .select('user_id, is_default, profiles(full_name, email)')
    .eq('jar_id', jarId)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isManager />
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-medium text-gray-900">{jar.name}</h1>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                  {jar.type}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {jar.type === 'ongoing'
                  ? 'Spend shown is for the current month.'
                  : 'Spend shown is lifetime for this event.'}
              </p>
            </div>
            <NavLinkButton href="/manager/jars" className="text-sm font-medium text-blue-600">
              Back
            </NavLinkButton>
          </div>

          {/* Budget summary */}
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">Budget</p>
                <p className="mt-1 break-words text-sm font-semibold text-gray-900 sm:text-lg">
                  ₹{jar.budget_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Spent</p>
                <p className="mt-1 break-words text-sm font-semibold text-gray-900 sm:text-lg">
                  ₹{spent.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{isOver ? 'Over by' : 'Remaining'}</p>
                <p className={`mt-1 break-words text-sm font-semibold sm:text-lg ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{Math.abs(remaining).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Categories</p>
              <NavLinkButton
                href={`/manager/categories?jar=${jar.id}`}
                className="text-sm font-medium text-blue-600"
              >
                Manage
              </NavLinkButton>
            </div>
            {categories && categories.length > 0 ? (
              <div
                className={`flex flex-wrap gap-2 ${categories.length > 5 ? 'thin-scrollbar max-h-32 overflow-y-auto pr-1' : ''}`}
              >
                {categories.map((c) => (
                  <span
                    key={c.id}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No categories yet.</p>
            )}
          </div>

          {/* Members */}
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-900">Members</p>
            {members && members.length > 0 ? (
              <div className={`space-y-2 ${members.length > 5 ? 'thin-scrollbar max-h-56 overflow-y-auto pr-1' : ''}`}>
                {members.map((m) => {
                  const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
                  return (
                    <div key={m.user_id} className="flex items-center justify-between text-sm">
                      <Link
                        href={`/manager/users/${m.user_id}`}
                        className="text-gray-900 hover:underline"
                      >
                        {p?.full_name ?? p?.email ?? 'Unknown'}
                      </Link>
                      {m.is_default && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                          Default
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No members assigned yet.</p>
            )}
          </div>

          {/* Recent expenses */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-900">Recent expenses</p>
            {recentExpenses && recentExpenses.length > 0 ? (
              <div className="space-y-2">
                {recentExpenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-900">{e.category_name}</p>
                      <p className="text-xs text-gray-500">
                        {e.user_name} • {new Date(e.entry_date).toLocaleDateString('en-IN')}
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
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import DownloadExcelButton from '@/components/DownloadExcelButton'
import MonthSelector from '@/components/MonthSelector'

const PAGE_SIZE = 15

export default async function JarDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string; month?: string }>
}) {
  const { id: jarId } = await params
  const sParams = await searchParams

  const page = Math.max(1, parseInt(sParams.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Handle month calculations & bound restrictions
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const selectedMonth = sParams.month || currentMonthStr

  const [year, month] = selectedMonth.split('-').map(Number)
  const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0]

  const supabase = await createClient()

  // 1. Verify User Session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Authorize User Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'manager') redirect('/')

  // 3. Fetch Jar master record
  const { data: jar, error: jarError } = await supabase
    .from('jars')
    .select('*')
    .eq('id', jarId)
    .single()

  if (jarError || !jar) {
    return (
      <div className="p-8 text-center text-sm text-red-500 bg-gray-50 dark:bg-zinc-950 h-screen">
        Jar not found: {jarError?.message}
        <br />
        <Link href="/manager/jars" className="text-blue-500 underline mt-4 inline-block">Go Back</Link>
      </div>
    )
  }

  const jarName = jar.name || 'Unnamed Jar'
  const jarType = jar.type || 'ongoing'
  const budget = Number(jar.budget_amount || 0)

  // 4. Query Expenses filtered by the selected timeframe
  let baseQuery = supabase
    .from('expenses')
    .select('id, amount, category_name, entry_date, user_name', { count: 'exact' })
    .eq('jar_id', jarId)

  if (jarType === 'ongoing') {
    baseQuery = baseQuery.gte('entry_date', startOfMonth).lte('entry_date', endOfMonth)
  }

  const { data: expenses, count: expenseCount } = await baseQuery
    .order('entry_date', { ascending: false })
    .range(from, to)

  // 5. Aggregate Total Spent
  let totalExpenseQuery = supabase
    .from('expenses')
    .select('amount')
    .eq('jar_id', jarId)

  if (jarType === 'ongoing') {
    totalExpenseQuery = totalExpenseQuery.gte('entry_date', startOfMonth).lte('entry_date', endOfMonth)
  }

  const { data: allPeriodExpenses } = await totalExpenseQuery
  const spent = (allPeriodExpenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)
  const remaining = budget - spent
  const totalPages = Math.max(1, Math.ceil((expenseCount ?? 0) / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
      <Navbar isManager />
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">

          {/* Top Header Row */}
          {/* Top Header Row */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-50">
                  {jarName}
                </h1>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {jarType}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                {jarType === 'ongoing' ? 'Schedules shown match selected monthly cycle.' : 'Spend shown is lifetime.'}
              </p>
            </div>

            {/* Controls Container: Centers on mobile view, right-aligned on desktop */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 w-full sm:w-auto mx-auto sm:mx-0">
              {jarType === 'ongoing' && (
                <MonthSelector defaultValue={selectedMonth} max={currentMonthStr} />
              )}

              <DownloadExcelButton
                jarId={jar.id}
                jarName={jarName}
                jarType={jarType}
                budget={budget}
                selectedMonth={selectedMonth}
                hasExpenses={spent > 0}
              />
              <Link href="/manager/jars" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                Back
              </Link>
            </div>
          </div>
          {/* Cards Display Grid */}
          <div className="mb-6 grid grid-cols-3 gap-4 rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-900 text-center">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Budget</p>
              <p className="mt-1 text-base font-semibold text-gray-900 dark:text-zinc-50">
                ₹{budget.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Spent</p>
              <p className="mt-1 text-base font-semibold text-gray-900 dark:text-zinc-50">
                ₹{spent.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Remaining</p>
              <p className={`mt-1 text-base font-semibold ${remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                ₹{remaining.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Ledger Table entries */}
          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-900">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-zinc-50">Line Item Entries</h2>

            {expenses && expenses.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-zinc-800 space-y-3">
                {expenses.map((e, index) => (
                  <div key={e.id} className={`flex items-center justify-between text-sm ${index !== 0 ? 'pt-3' : ''}`}>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-zinc-100">{e.category_name}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                        Spent by {e.user_name} · {new Date(e.entry_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-zinc-50">
                      ₹{Number(e.amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-zinc-400 py-2">No active expenses logged during this period.</p>
            )}

            {/* Pagination Controls */}
            {expenseCount !== null && expenseCount > PAGE_SIZE && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-zinc-800">
                <Link
                  href={`?month=${selectedMonth}&page=${page - 1}`}
                  className={`text-sm font-medium ${page <= 1 ? 'pointer-events-none text-gray-300 dark:text-zinc-700' : 'text-blue-600 dark:text-blue-400 hover:underline'
                    }`}
                >
                  Previous
                </Link>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Page {page} of {totalPages}
                </p>
                <Link
                  href={`?month=${selectedMonth}&page=${page + 1}`}
                  className={`text-sm font-medium ${page >= totalPages ? 'pointer-events-none text-gray-300 dark:text-zinc-700' : 'text-blue-600 dark:text-blue-400 hover:underline'
                    }`}
                >
                  Next
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
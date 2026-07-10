import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import NavLinkButton from '@/components/NavLinkButton'
import SettlementManager from '@/components/SettlementManager'

function parseMonthParam(monthParam?: string): Date {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number)
    return new Date(y, m - 1, 1)
  }
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default async function ReimbursementsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const monthStart = parseMonthParam(monthParam)
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)

  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)

  const realNow = new Date()
  const currentRealMonth = new Date(realNow.getFullYear(), realNow.getMonth(), 1)
  const isNextDisabled = nextMonth > currentRealMonth

  const monthStartStr = monthStart.toISOString().split('T')[0]
  const monthEndStr = monthEnd.toISOString().split('T')[0]

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

  const { data: jars } = await supabase
    .from('jars')
    .select('id, name')
    .order('name')

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, jar_id, user_id, user_name, amount, category_name, entry_date')
    .gte('entry_date', monthStartStr)
    .lt('entry_date', monthEndStr)
    .order('entry_date', { ascending: false })

  const { data: settlements } = await supabase
    .from('settlements')
    .select('jar_id, user_id, amount_settled, settled_at')
    .eq('month', monthStartStr)

  const settlementMap = new Map(
    (settlements ?? []).map((s) => [`${s.jar_id}:${s.user_id}`, s])
  )

  const jarGroups = (jars ?? []).map((jar) => {
    const jarExpenses = (expenses ?? []).filter((e) => e.jar_id === jar.id)

    const byUser = new Map<
      string,
      {
        user_id: string
        user_name: string
        total: number
        items: { id: string; amount: number; category_name: string; entry_date: string }[]
      }
    >()

    for (const e of jarExpenses) {
      const existing = byUser.get(e.user_id)
      const item = {
        id: e.id,
        amount: Number(e.amount),
        category_name: e.category_name,
        entry_date: e.entry_date,
      }
      if (existing) {
        existing.total += Number(e.amount)
        existing.items.push(item)
      } else {
        byUser.set(e.user_id, {
          user_id: e.user_id,
          user_name: e.user_name,
          total: Number(e.amount),
          items: [item],
        })
      }
    }

    const members = Array.from(byUser.values()).map((m) => {
      const settlement = settlementMap.get(`${jar.id}:${m.user_id}`)
      return {
        ...m,
        settled: !!settlement,
        amountSettled: settlement ? Number(settlement.amount_settled) : null,
        settledAt: settlement ? settlement.settled_at : null,
      }
    })

    return { jar, members }
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
      <Navbar isManager />
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-50">Reimbursements</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                Money members spent from their own pocket, per Jar, per month.
              </p>
            </div>
            <NavLinkButton href="/manager" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Back
            </NavLinkButton>
          </div>

          {/* Month navigator */}
          <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-900">
            <NavLinkButton
              href={`?month=${monthKey(prevMonth)}`}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Prev
            </NavLinkButton>
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-50">{monthLabel(monthStart)}</p>
            {isNextDisabled ? (
              <span className="text-sm font-medium text-gray-300 dark:text-zinc-700">Next →</span>
            ) : (
              <NavLinkButton
                href={`?month=${monthKey(nextMonth)}`}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Next →
              </NavLinkButton>
            )}
          </div>

          <SettlementManager jarGroups={jarGroups} monthStr={monthStartStr} />
        </div>
      </div>
    </div>
  )
}
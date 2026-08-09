import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import NavLinkButton from '@/components/NavLinkButton'
import SettlementManager from '@/components/SettlementManager'

// Formats a local date to YYYY-MM-DD string without timezone conversion
function formatLocalDate(year: number, monthZeroIndexed: number, day: number): string {
  const y = year
  const m = String(monthZeroIndexed + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseMonthParam(monthParam?: string): { year: number; monthZeroBased: number } {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number)
    return { year: y, monthZeroBased: m - 1 }
  }
  const now = new Date()
  return { year: now.getFullYear(), monthZeroBased: now.getMonth() }
}

function monthKey(year: number, monthZeroBased: number) {
  return `${year}-${String(monthZeroBased + 1).padStart(2, '0')}`
}

function monthLabel(year: number, monthZeroBased: number) {
  return new Date(year, monthZeroBased, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

export default async function ReimbursementsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const { year, monthZeroBased } = parseMonthParam(monthParam)

  // Calculate local month start and end dates
  const startDateStr = formatLocalDate(year, monthZeroBased, 1)
  
  // Last day of current month
  const lastDayNumber = new Date(year, monthZeroBased + 1, 0).getDate()
  const endDateStr = formatLocalDate(year, monthZeroBased, lastDayNumber)

  // Bounds for timestamp columns (created_at)
  const startTimestampStr = `${startDateStr}T00:00:00.000Z`
  const endTimestampStr = `${endDateStr}T23:59:59.999Z`

  // Previous & Next navigation logic
  const prevDate = new Date(year, monthZeroBased - 1, 1)
  const nextDate = new Date(year, monthZeroBased + 1, 1)

  const realNow = new Date()
  const currentRealMonth = new Date(realNow.getFullYear(), realNow.getMonth(), 1)
  const isNextDisabled = nextDate > currentRealMonth

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

  // Query expenses using clean DATE strings (YYYY-MM-DD)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, jar_id, user_id, user_name, amount, category_name, entry_date')
    .gte('entry_date', startDateStr)
    .lte('entry_date', endDateStr)
    .order('entry_date', { ascending: false })

  // Query advances using full day TIMESTAMPS
  const { data: advances } = await supabase
    .from('jar_advances')
    .select('id, jar_id, user_id, amount, note, created_at')
    .gte('created_at', startTimestampStr)
    .lte('created_at', endTimestampStr)
    .order('created_at', { ascending: false })

  const jarGroups = (jars ?? []).map((jar) => {
    const jarExpenses = (expenses ?? []).filter((e) => e.jar_id === jar.id)
    const jarAdvances = (advances ?? []).filter((a) => a.jar_id === jar.id)

    const byUser = new Map<
      string,
      {
        user_id: string
        user_name: string
        totalSpent: number
        totalAdvances: number
        items: { id: string; amount: number; category_name: string; entry_date: string }[]
        advancesList: { id: string; amount: number; note: string | null; created_at: string }[]
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
        existing.totalSpent += Number(e.amount)
        existing.items.push(item)
      } else {
        byUser.set(e.user_id, {
          user_id: e.user_id,
          user_name: e.user_name || 'Member',
          totalSpent: Number(e.amount),
          totalAdvances: 0,
          items: [item],
          advancesList: [],
        })
      }
    }

    for (const a of jarAdvances) {
      const existing = byUser.get(a.user_id)
      const advItem = {
        id: a.id,
        amount: Number(a.amount),
        note: a.note,
        created_at: a.created_at,
      }
      if (existing) {
        existing.totalAdvances += Number(a.amount)
        existing.advancesList.push(advItem)
      } else {
        byUser.set(a.user_id, {
          user_id: a.user_id,
          user_name: 'Member',
          totalSpent: 0,
          totalAdvances: Number(a.amount),
          items: [],
          advancesList: [advItem],
        })
      }
    }

    const members = Array.from(byUser.values()).map((m) => {
      const remainingDue = Math.max(0, m.totalSpent - m.totalAdvances)
      return {
        ...m,
        remainingDue,
        settled: remainingDue <= 0 && m.totalSpent > 0,
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
                Track advances given and settle remaining dues per member, per jar.
              </p>
            </div>
            <NavLinkButton href="/manager" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Back
            </NavLinkButton>
          </div>

          <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-900">
            <NavLinkButton
              href={`?month=${monthKey(prevDate.getFullYear(), prevDate.getMonth())}`}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Prev
            </NavLinkButton>
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
              {monthLabel(year, monthZeroBased)}
            </p>
            {isNextDisabled ? (
              <span className="text-sm font-medium text-gray-300 dark:text-zinc-700">Next →</span>
            ) : (
              <NavLinkButton
                href={`?month=${monthKey(nextDate.getFullYear(), nextDate.getMonth())}`}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Next →
              </NavLinkButton>
            )}
          </div>

          <SettlementManager jarGroups={jarGroups} selectedDate={startDateStr} />
        </div>
      </div>
    </div>
  )
}
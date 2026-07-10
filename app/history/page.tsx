import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import MonthDropdownSelector from '@/components/MonthDropdownSelector'
import ActivityExpenseRow from '@/components/ActivityExpenseRow'
import DownloadHistoryButton from '@/components/DownloadHistoryButton'

const PAGE_SIZE = 10
// ... keep your imports the same ...

export default async function MonthHistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string; page?: string; jar?: string }>
}) {
    const { month: monthParam, page: pageParam, jar: requestedJarId } = await searchParams

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0')
    const activeMonth = monthParam ?? currentMonthStr

    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // ... (Keep profile and jar memberships fetching exactly the same) ...
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const { data: memberships } = await supabase.from('jar_members').select('jar_id, is_default, jars(id, name)').eq('user_id', user.id)
    if (!memberships || memberships.length === 0) redirect('/')
    const requestedMembership = requestedJarId ? memberships.find((m) => m.jar_id === requestedJarId) : undefined
    const defaultMembership = memberships.find((m) => m.is_default) ?? memberships[0]
    const activeMembership = requestedMembership ?? defaultMembership
    const jar = activeMembership.jars as unknown as { id: string; name: string }

    const startDate = `${currentYear}-${activeMonth}-01`
    const lastDay = new Date(currentYear, parseInt(activeMonth, 10), 0).getDate()
    const endDate = `${currentYear}-${activeMonth}-${String(lastDay).padStart(2, '0')}`

    /* ------------------------------------------------------------- */
    /* 1. NEW: FETCH ALL MONTHLY ENTRIES TO CALCULATE ACCURATE STATS  */
    /* ------------------------------------------------------------- */
    const { data: allMonthlyEntries } = await supabase
        .from('expenses')
        .select('amount, category_name, entry_date')
        .eq('jar_id', jar.id)
        .eq('user_id', user.id)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)

    // Calculate dynamic stats
    const totalMonthlyExpense = allMonthlyEntries?.reduce((sum, item) => sum + Number(item.amount), 0) || 0

    // Find top category
    const categoryTotals = allMonthlyEntries?.reduce((acc, item) => {
        acc[item.category_name] = (acc[item.category_name] || 0) + Number(item.amount)
        return acc
    }, {} as Record<string, number>) || {}

    const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
    const topCategoryName = topCategoryEntry ? topCategoryEntry[0] : 'None'
    /* ------------------------------------------------------------- */

    // 2. Paginated Query (Kept exactly as you had it for display list)
    const { data: expenses, count } = await supabase
        .from('expenses')
        .select('id, amount, category_name, user_name, user_id, entry_date, is_recurring', { count: 'exact' })
        .eq('jar_id', jar.id)
        .eq('user_id', user.id)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)

    const totalCount = count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
    const rangeStart = totalCount === 0 ? 0 : from + 1
    const rangeEnd = Math.min(from + PAGE_SIZE, totalCount)

    function getPaginationLink(targetPage: number) {
        const params = new URLSearchParams()
        params.set('jar', jar.id)
        params.set('month', activeMonth)
        if (targetPage > 1) params.set('page', String(targetPage))
        return `/history?${params.toString()}`
    }

    const groups: { date: string; items: typeof expenses }[] = []
    for (const exp of expenses ?? []) {
        const existing = groups.find((g) => g.date === exp.entry_date)
        if (existing) {
            existing.items!.push(exp)
        } else {
            groups.push({ date: exp.entry_date, items: [exp] })
        }
    }

    function formatDateLabel(dateStr: string) {
        const date = new Date(dateStr + 'T00:00:00')
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
            <Navbar isManager={profile?.role === 'manager'} />
            <div className="px-4 py-6">
                <div className="mx-auto max-w-2xl">

                    {/* Header Controls */}
                    <div className="mb-6 flex items-start justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-50">{jar.name} Monthly History</h1>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Current Year -  {currentYear}</p>
                        </div>
                        <Link href={`/?jar=${jar.id}`} className="shrink-0 text-sm font-medium text-blue-600 dark:text-blue-400">
                            Back
                        </Link>
                    </div>

                    {/* Interactive Dropdown Client Selector Component */}
                    <MonthDropdownSelector
                        jarId={jar.id}
                        activeMonth={activeMonth}
                        currentYear={currentYear}
                    />

                    {/* ------------------------------------------------------------- */}
                    {/* NEW: STATS SNAPSHOT CARDS                                    */}
                    {/* ------------------------------------------------------------- */}

                    <div className="mb-6">
                        <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 w-full flex flex-col gap-1">
                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                                    {activeMonth === currentMonthStr ? 'Total Spent (Sum Till Today)' : 'Total Monthly Spent'}
                                </p>
                                <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-zinc-50">
                                    ₹{totalMonthlyExpense.toLocaleString('en-IN')}
                                </p>
                            </div>

                            <DownloadHistoryButton
                                expenses={(allMonthlyEntries || []) as Array<{ category_name: string; entry_date: string; amount: string | number }>}
                                monthLabel={new Date(currentYear, parseInt(activeMonth, 10) - 1).toLocaleString('en-US', { month: 'long' })}
                                year={currentYear}
                                totalAmount={totalMonthlyExpense}
                                isCurrentMonth={activeMonth === currentMonthStr}
                                disabled={totalMonthlyExpense === 0} // 3. Disables button instantly if total is ₹0
                            />
                        </div>
                    </div>
                    {/* ------------------------------------------------------------- */}

                    {/* Meta Counters */}
                    {totalCount > 0 && (
                        <p className="mb-3 text-right text-xs text-gray-500 dark:text-zinc-500">
                            Showing {rangeStart}-{rangeEnd} of {totalCount}
                        </p>
                    )}

                    {/* Expense rendering wrapper */}
                    {groups.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                            <p className="text-sm text-gray-500 dark:text-zinc-500">No logs saved for this month.</p>
                        </div>
                    ) : (
                        groups.map((group) => {
                            const dayTotal = group.items!.reduce((sum, e) => sum + Number(e.amount), 0)
                            return (
                                <div key={group.date} className="mb-5">
                                    <div className="mb-2 flex items-baseline justify-between">
                                        <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                                            {formatDateLabel(group.date)}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                                            ₹{dayTotal.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-white px-4 shadow-sm dark:bg-zinc-900">
                                        {group.items!.map((item, i) => (
                                            <ActivityExpenseRow
                                                key={item.id}
                                                item={item}
                                                currentUserId={user.id}
                                                showOwner={false}
                                                showBorder={i < group.items!.length - 1}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })
                    )}

                    {/* Pagination Card */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-900">
                            {page > 1 ? (
                                <Link
                                    href={getPaginationLink(page - 1)}
                                    className="text-sm font-medium text-blue-600 dark:text-blue-400"
                                >
                                    ← Prev
                                </Link>
                            ) : (
                                <span className="text-sm font-medium text-gray-300 dark:text-zinc-700">← Prev</span>
                            )}

                            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                Page {page} of {totalPages}
                            </p>

                            {page < totalPages ? (
                                <Link
                                    href={getPaginationLink(page + 1)}
                                    className="text-sm font-medium text-blue-600 dark:text-blue-400"
                                >
                                    Next →
                                </Link>
                            ) : (
                                <span className="text-sm font-medium text-gray-300 dark:text-zinc-700">Next →</span>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
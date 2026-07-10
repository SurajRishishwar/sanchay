import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import NavLinkButton from '@/components/NavLinkButton'
import ActivityExpenseRow from '@/components/ActivityExpenseRow'

const PAGE_SIZE = 10

export default async function ActivityPage({
    searchParams,
}: {
    searchParams: Promise<{ filter?: string; page?: string; jar?: string }>
}) {
    const { filter, page: pageParam, jar: requestedJarId } = await searchParams
    const showMineOnly = filter !== 'all'
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

    const { data: memberships } = await supabase
        .from('jar_members')
        .select('jar_id, is_default, jars(id, name)')
        .eq('user_id', user.id)

    if (!memberships || memberships.length === 0) {
        redirect('/')
    }

    const requestedMembership = requestedJarId
        ? memberships.find((m) => m.jar_id === requestedJarId)
        : undefined
    const defaultMembership = memberships.find((m) => m.is_default) ?? memberships[0]
    const activeMembership = requestedMembership ?? defaultMembership

    const jar = activeMembership.jars as unknown as { id: string; name: string }

    let query = supabase
        .from('expenses')
        .select('id, amount, category_name, user_name, user_id, entry_date, is_recurring', { count: 'exact' })
        .eq('jar_id', jar.id)

    if (showMineOnly) {
        query = query.eq('user_id', user.id)
    }

    const { data: expenses, count } = await query
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)

    const totalCount = count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
    const rangeStart = totalCount === 0 ? 0 : from + 1
    const rangeEnd = Math.min(from + PAGE_SIZE, totalCount)

    function pageLink(targetPage: number) {
        const params = new URLSearchParams()
        params.set('jar', jar.id)
        if (!showMineOnly) params.set('filter', 'all')
        if (targetPage > 1) params.set('page', String(targetPage))
        return `/activity?${params.toString()}`
    }

    function filterLink(mine: boolean) {
        const params = new URLSearchParams()
        params.set('jar', jar.id)
        if (!mine) params.set('filter', 'all')
        return `/activity?${params.toString()}`
    }

    // Group this page's expenses by date for display
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
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)

        const isSameDay = (a: Date, b: Date) =>
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()

        if (isSameDay(date, today)) return 'Today'
        if (isSameDay(date, yesterday)) return 'Yesterday'
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
    }

    return (
        /* Added dark:bg-zinc-950 and client transition support */
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
            <Navbar isManager={profile?.role === 'manager'} />
            <div className="px-4 py-6">
                <div className="mx-auto max-w-2xl">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            {/* Added dark:text-zinc-50 */}
                            <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-50">{jar.name} activity</h1>
                            {/* Added dark:text-zinc-400 */}
                            <p className="text-sm text-gray-500 dark:text-zinc-400">
                                {showMineOnly ? 'Only your expenses' : 'All expenses logged by everyone in this jar'}
                            </p>
                        </div>
                        {/* Added dark:text-blue-400 */}
                        <Link href={`/?jar=${jar.id}`} className="shrink-0 text-sm font-medium text-blue-600 dark:text-blue-400">
                            Back
                        </Link>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        {/* Added dark:bg-zinc-900 */}
                        <div className="inline-flex rounded-lg bg-gray-200 dark:bg-zinc-900 p-1 text-sm">
                            <NavLinkButton
                                href={filterLink(false)}
                                /* Added dark mode toggle combinations for background pills */
                                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                                    !showMineOnly 
                                        ? 'bg-white text-gray-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50' 
                                        : 'text-gray-600 dark:text-zinc-400'
                                }`}
                            >
                                All
                            </NavLinkButton>
                            <NavLinkButton
                                href={filterLink(true)}
                                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                                    showMineOnly 
                                        ? 'bg-white text-gray-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50' 
                                        : 'text-gray-600 dark:text-zinc-400'
                                }`}
                            >
                                Just me
                            </NavLinkButton>
                        </div>

                        {totalCount > 0 && (
                            /* Added dark:text-zinc-500 */
                            <p className="text-xs text-gray-500 dark:text-zinc-500">
                                Showing {rangeStart}-{rangeEnd} of {totalCount}
                            </p>
                        )}
                    </div>

                    {groups.length === 0 ? (
                        /* Added dark:text-zinc-500 */
                        <p className="text-sm text-gray-500 dark:text-zinc-500">
                            {showMineOnly ? "You haven't logged anything yet." : 'No expenses logged yet.'}
                        </p>
                    ) : (
                        groups.map((group) => {
                            const dayTotal = group.items!.reduce((sum, e) => sum + Number(e.amount), 0)

                            return (
                                <div key={group.date} className="mb-5">
                                    <div className="mb-2 flex items-baseline justify-between">
                                        {/* Added dark:text-zinc-400 */}
                                        <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                                            {formatDateLabel(group.date)}
                                        </p>
                                        {/* Added dark:text-zinc-400 */}
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                                            ₹{dayTotal.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    {/* Added dark:bg-zinc-900 */}
                                    <div className="rounded-xl bg-white px-4 shadow-sm dark:bg-zinc-900">
                                        {group.items!.map((item, i) => (
                                            <ActivityExpenseRow
                                                key={item.id}
                                                item={item}
                                                currentUserId={user.id}
                                                showOwner={!showMineOnly}
                                                showBorder={i < group.items!.length - 1}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })
                    )}

                    {/* Pagination Card Wrapper */}
                    {totalPages > 1 && (
                        /* Added dark:bg-zinc-900 */
                        <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-900">
                            {page > 1 ? (
                                /* Added dark:text-blue-400 */
                                <NavLinkButton
                                    href={pageLink(page - 1)}
                                    className="text-sm font-medium text-blue-600 dark:text-blue-400"
                                >
                                    ← Prev
                                </NavLinkButton>
                            ) : (
                                /* Added dark:text-zinc-700 */
                                <span className="text-sm font-medium text-gray-300 dark:text-zinc-700">← Prev</span>
                            )}

                            {/* Added dark:text-zinc-100 */}
                            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                Page {page} of {totalPages}
                            </p>

                            {page < totalPages ? (
                                /* Added dark:text-blue-400 */
                                <NavLinkButton
                                    href={pageLink(page + 1)}
                                    className="text-sm font-medium text-blue-600 dark:text-blue-400"
                                >
                                    Next →
                                </NavLinkButton>
                            ) : (
                                /* Added dark:text-zinc-700 */
                                <span className="text-sm font-medium text-gray-300 dark:text-zinc-700">Next →</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
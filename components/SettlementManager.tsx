'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

type ExpenseItem = {
    id: string
    amount: number
    category_name: string
    entry_date: string
}

type Member = {
    user_id: string
    user_name: string
    total: number
    items: ExpenseItem[]
    settled: boolean
    amountSettled: number | null
    settledAt: string | null
}

type JarGroup = {
    jar: { id: string; name: string }
    members: Member[]
}

export default function SettlementManager({
    jarGroups,
    monthStr,
}: {
    jarGroups: JarGroup[]
    monthStr: string
}) {
    const router = useRouter()
    const { showToast } = useToast()

    const [busyKey, setBusyKey] = useState<string | null>(null)
    const [confirmingUnmarkKey, setConfirmingUnmarkKey] = useState<string | null>(null)
    const [expandedKey, setExpandedKey] = useState<string | null>(null)

    async function handleMarkPaid(jarId: string, userId: string, amount: number) {
        const key = `${jarId}:${userId}`
        setBusyKey(key)

        const supabase = createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            setBusyKey(null)
            return
        }

        const { error } = await supabase.from('settlements').insert({
            jar_id: jarId,
            user_id: userId,
            month: monthStr,
            amount_settled: amount,
            settled_by: user.id,
        })

        setBusyKey(null)

        if (error) {
            showToast('Could not mark as paid: ' + error.message)
            return
        }

        showToast('Marked as paid')
        router.refresh()
    }

    async function handleUnmark(jarId: string, userId: string) {
        const key = `${jarId}:${userId}`
        setBusyKey(key)

        const supabase = createClient()
        const { error } = await supabase
            .from('settlements')
            .delete()
            .eq('jar_id', jarId)
            .eq('user_id', userId)
            .eq('month', monthStr)

        setBusyKey(null)

        if (error) {
            showToast('Could not unmark: ' + error.message)
            return
        }

        showToast('Unmarked')
        setConfirmingUnmarkKey(null)
        router.refresh()
    }

    const hasAnyMembers = jarGroups.some((g) => g.members.length > 0)

    if (!hasAnyMembers) {
        return (
            <div className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-sm">
                No expenses logged by any member for this month.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {jarGroups.map(({ jar, members }) => {
                if (members.length === 0) return null

                return (
                    <div key={jar.id} className="rounded-xl bg-white p-4 shadow-sm">
                        <p className="mb-3 text-sm font-semibold text-gray-900">{jar.name}</p>

                        <div className="space-y-2">
                            {members.map((m) => {
                                const key = `${jar.id}:${m.user_id}`
                                const isBusy = busyKey === key

                                return (
                                    <div key={key} className="rounded-lg bg-gray-50 p-3">
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() =>
                                                    setExpandedKey(expandedKey === key ? null : key)
                                                }
                                                className="min-w-0 flex-1 text-left"
                                            >
                                                <p className="text-sm font-medium text-gray-900 hover:underline">
                                                    {m.user_name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Spent: ₹{m.total.toLocaleString('en-IN')} · {m.items.length}{' '}
                                                    {m.items.length === 1 ? 'expense' : 'expenses'}
                                                </p>
                                            </button>

                                            {m.settled ? (
                                                confirmingUnmarkKey === key ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setConfirmingUnmarkKey(null)}
                                                            disabled={isBusy}
                                                            className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm disabled:opacity-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleUnmark(jar.id, m.user_id)}
                                                            disabled={isBusy}
                                                            className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                                                        >
                                                            {isBusy ? 'Undoing...' : 'Confirm unmark'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmingUnmarkKey(key)}
                                                        className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                                                    >
                                                        ✓ Paid
                                                    </button>
                                                )
                                            ) : (
                                                <button
                                                    onClick={() => handleMarkPaid(jar.id, m.user_id, m.total)}
                                                    disabled={isBusy}
                                                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                                                >
                                                    {isBusy ? 'Marking...' : 'Mark as Paid'}
                                                </button>
                                            )}
                                        </div>

                                        {m.settled && m.settledAt && (
                                            <p className="mt-1 text-xs text-gray-400">
                                                Settled ₹{m.amountSettled?.toLocaleString('en-IN')} on{' '}
                                                {new Date(m.settledAt).toLocaleDateString('en-IN')}
                                            </p>
                                        )}

                                        {expandedKey === key && (
                                            <div className="mt-3 space-y-1.5 border-t border-gray-200 pt-3">
                                                {m.items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between text-xs"
                                                    >
                                                        <div>
                                                            <span className="text-gray-700">{item.category_name}</span>
                                                            <span className="ml-2 text-gray-400">
                                                                {new Date(item.entry_date).toLocaleDateString('en-IN')}
                                                            </span>
                                                        </div>
                                                        <span className="font-medium text-gray-900">
                                                            ₹{item.amount.toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
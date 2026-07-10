'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

type ExpenseRowData = {
    id: string
    amount: number
    category_name: string
    user_name: string
    user_id: string
    entry_date: string
    is_recurring: boolean
}

function isEditable(item: ExpenseRowData, currentUserId: string) {
    if (item.user_id !== currentUserId) return false
    if (item.is_recurring) return false

    const now = new Date()
    const entry = new Date(item.entry_date + 'T00:00:00')
    return (
        entry.getFullYear() === now.getFullYear() &&
        entry.getMonth() === now.getMonth()
    )
}

export default function ActivityExpenseRow({
    item,
    currentUserId,
    showOwner,
    showBorder,
}: {
    item: ExpenseRowData
    currentUserId: string
    showOwner: boolean
    showBorder: boolean
}) {
    const router = useRouter()
    const { showToast } = useToast()

    const [editing, setEditing] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [amount, setAmount] = useState(String(item.amount))
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const editable = isEditable(item, currentUserId)

    function openEdit() {
        if (!editable) return
        setAmount(String(item.amount))
        setEditing(true)
        setConfirmingDelete(false)
        setError(null)
    }

    function closeEdit() {
        setEditing(false)
        setConfirmingDelete(false)
        setError(null)
    }

    async function handleSave() {
        const value = parseFloat(amount)
        if (!value || value <= 0) {
            setError('Enter a valid amount')
            return
        }

        setSubmitting(true)
        setError(null)

        const supabase = createClient()
        const { error } = await supabase
            .from('expenses')
            .update({ amount: value })
            .eq('id', item.id)

        setSubmitting(false)

        if (error) {
            setError(error.message)
            return
        }

        showToast('Expense updated')
        closeEdit()
        router.refresh()
    }

    async function handleDelete() {
        setSubmitting(true)
        setError(null)

        const supabase = createClient()
        const { error } = await supabase.from('expenses').delete().eq('id', item.id)

        setSubmitting(false)

        if (error) {
            setError(error.message)
            return
        }

        showToast('Expense deleted')
        closeEdit()
        router.refresh()
    }

    if (editing) {
        return (
            /* Updated border targets */
            <div className={`py-3 ${showBorder ? 'border-b border-gray-100 dark:border-zinc-800' : ''}`}>
                {!confirmingDelete ? (
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            {/* Updated dark text classes */}
                            <p className="text-sm text-gray-900 dark:text-zinc-100">{item.category_name}</p>
                            <button
                                onClick={closeEdit}
                                className="text-xs font-medium text-gray-500 dark:text-zinc-400"
                            >
                                Cancel
                            </button>
                        </div>
                        {/* Input Container Wrapper */}
                        <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-300 dark:border-zinc-700 px-3 py-2 bg-transparent">
                            <span className="text-gray-500 dark:text-zinc-400">₹</span>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full text-sm text-gray-900 dark:text-zinc-100 bg-transparent outline-none"
                                autoFocus
                            />
                        </div>
                        {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmingDelete(true)}
                                disabled={submitting}
                                /* Dark warning modes configured */
                                className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 disabled:opacity-50"
                            >
                                Delete
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={submitting}
                                className="ml-auto rounded-lg bg-gray-900 dark:bg-zinc-100 px-4 py-1.5 text-xs font-medium text-white dark:text-zinc-950 disabled:opacity-50"
                            >
                                {submitting ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Confirming Delete State Block */
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3">
                        <p className="mb-3 text-sm text-red-700 dark:text-red-300">
                            Delete this ₹{item.amount.toLocaleString('en-IN')} {item.category_name} expense?
                        </p>
                        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmingDelete(false)}
                                disabled={submitting}
                                className="flex-1 rounded-lg bg-white dark:bg-zinc-800 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 shadow-sm disabled:opacity-50 border dark:border-zinc-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={submitting}
                                className="flex-1 rounded-lg bg-red-600 dark:bg-red-700 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                                {submitting ? 'Deleting...' : 'Yes, delete'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        /* Standard Row View Toggle Container */
        <button
            onClick={openEdit}
            disabled={!editable}
            className={`flex w-full items-center justify-between py-3 text-left transition-colors duration-150 ${
                showBorder ? 'border-b border-gray-100 dark:border-zinc-800' : ''
            } ${editable ? 'active:bg-gray-50 dark:active:bg-zinc-800/50' : ''}`}
        >
            <div>
                <p className="text-sm text-gray-900 dark:text-zinc-100">{item.category_name}</p>
                {showOwner && <p className="text-xs text-gray-500 dark:text-zinc-400">{item.user_name}</p>}
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                ₹{item.amount.toLocaleString('en-IN')}
            </p>
        </button>
    )
}
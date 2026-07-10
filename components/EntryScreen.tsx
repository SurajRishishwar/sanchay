'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import JarSwitcher from '@/components/JarSwitcher'
import Navbar from '@/components/Navbar'
import { useToast } from '@/components/Toast'
import Link from 'next/link'

type Category = { id: string; name: string }
type ActivityItem = {
    id: string
    amount: number
    category: string
    name: string
    ownerId: string
}
type Jar = { id: string; name: string }

export default function EntryScreen({
    jarId,
    jarName,
    allJars,
    userId,
    userName,
    categories,
    initialActivity,
    isManager = false,
}: {
    jarId: string
    jarName: string
    allJars: Jar[]
    userId: string
    userName: string
    categories: Category[]
    initialActivity: ActivityItem[]
    isManager?: boolean
}) {
    const router = useRouter()
    const { showToast } = useToast()

    const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null)
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [amount, setAmount] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const todayTotal = initialActivity.reduce((sum, item) => sum + item.amount, 0)
    const sheetOpen = selectedCategoryName !== null

    /* --- FRONTEND SORTING LOGIC --- */
    // 1. Count frequencies matching by category name from the initialActivity array
    const categoryCounts = initialActivity.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    // 2. Sort the array: Frequent entries first, alphabetical fallback if tied/unlogged
    const sortedCategories = [...categories].sort((a, b) => {
        const countA = categoryCounts[a.name] || 0
        const countB = categoryCounts[b.name] || 0

        if (countB !== countA) {
            return countB - countA // Higher usage count floats to top
        }
        return a.name.localeCompare(b.name) // Secondary fallback: A to Z alphabetical
    })
    /* -------------------------------- */

    function openAddSheet(cat: Category) {
        setSelectedCategoryName(cat.name)
        setSelectedCategoryId(cat.id)
        setEditingId(null)
        setConfirmingDelete(false)
        setAmount('')
        setError(null)
    }

    function openEditSheet(item: ActivityItem) {
        if (item.ownerId !== userId) return // only your own entries are editable
        setSelectedCategoryName(item.category)
        setSelectedCategoryId(null)
        setEditingId(item.id)
        setConfirmingDelete(false)
        setAmount(String(item.amount))
        setError(null)
    }

    function closeSheet() {
        setSelectedCategoryName(null)
        setEditingId(null)
        setConfirmingDelete(false)
    }

    async function handleSave() {
        const value = parseFloat(amount)
        if (!value || value <= 0) return

        setSubmitting(true)
        setError(null)

        const supabase = createClient()

        if (editingId) {
            const { error } = await supabase
                .from('expenses')
                .update({ amount: value })
                .eq('id', editingId)
            setSubmitting(false)
            if (error) {
                setError(error.message)
                return
            }
            showToast('Expense updated')
        } else {
            const { error } = await supabase.from('expenses').insert({
                jar_id: jarId,
                user_id: userId,
                user_name: userName,
                category_id: selectedCategoryId,
                category_name: selectedCategoryName,
                amount: value,
            })
            setSubmitting(false)
            if (error) {
                setError(error.message)
                return
            }
            showToast('Expense added')
        }

        closeSheet()
        router.refresh()
    }

    async function handleDelete() {
        if (!editingId) return
        setSubmitting(true)
        const supabase = createClient()
        const { error } = await supabase.from('expenses').delete().eq('id', editingId)
        setSubmitting(false)
        if (error) {
            setError(error.message)
            return
        }
        showToast('Expense deleted')
        closeSheet()
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
            <Navbar isManager={isManager} />
            <div className="px-4 py-6">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-6">
                        <JarSwitcher jars={allJars} currentJarId={jarId} currentJarName={jarName} />
                        <p className="text-sm text-gray-500 dark:text-zinc-400">
                            {new Date().toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className='divide-y divide-gray-100 dark:divide-zinc-800 max-h-60 overflow-y-auto pr-6 md:max-h-none md:overflow-visible md:pr-0'>
                            <p className="mb-3 text-sm text-gray-600 dark:text-zinc-400">Tap a category to log an expense</p>

                            {sortedCategories.length === 0 ? (
                                <div className="rounded-xl bg-white p-4 text-sm text-gray-500 dark:bg-zinc-900 dark:text-zinc-400 shadow-sm">
                                    No categories yet. Ask your manager to add some before you can log expenses.
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {/* FIXED: Loop over sortedCategories instead of categories */}
                                    {sortedCategories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => openAddSheet(cat)}
                                            className="rounded-xl bg-white px-3 py-4 text-sm font-medium text-gray-700 dark:bg-zinc-900 dark:text-zinc-100 shadow-sm active:scale-95 transition-all"
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
                            <div className="mb-3 flex items-baseline justify-between">
                                <p className="text-sm font-medium text-gray-900 dark:text-zinc-50">Today's activity</p>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">
                                    Total: ₹{todayTotal.toLocaleString('en-IN')}
                                </p>
                            </div>
                            <Link href={`/activity?jar=${jarId}`} className="mb-3 inline-block text-xs font-medium text-blue-600 dark:text-blue-400">
                                View all activity →
                            </Link>

                            {initialActivity.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-zinc-500">No expenses logged yet today.</p>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-zinc-800 max-h-72 overflow-y-auto pr-6">
                                    {initialActivity.map((item) => {
                                        const isMine = item.ownerId === userId
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => isMine && openEditSheet(item)}
                                                className={`flex items-center justify-between py-2 ${isMine ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-lg px-1 -mx-1' : ''}`}
                                            >
                                                <div>
                                                    <p className="text-sm text-gray-900 dark:text-zinc-200">{item.category}</p>
                                                </div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-zinc-200">
                                                    ₹{item.amount.toLocaleString('en-IN')}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Backdrop */}
            <div
                onClick={closeSheet}
                className={`fixed inset-0 z-20 bg-black transition-opacity duration-300 ${sheetOpen ? 'opacity-40 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            />

            {/* Sheet on mobile, centered modal on desktop */}
            <div
                className={`fixed inset-0 z-30 flex items-end justify-center md:items-center ${sheetOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
                <div
                    className={`w-full rounded-t-2xl bg-white p-5 shadow-lg transition-all duration-300 ease-out md:mx-4 md:w-full md:max-w-md md:rounded-2xl ${sheetOpen
                        ? 'translate-y-0 opacity-100 md:scale-100'
                        : 'translate-y-full opacity-0 md:translate-y-0 md:scale-95'
                        } dark:bg-zinc-900`}
                >
                    <div className="mx-auto max-w-md">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-base font-medium text-gray-900 dark:text-zinc-50">
                                {selectedCategoryName ?? ''}
                                {editingId && <span className="ml-2 text-xs font-normal text-gray-400 dark:text-zinc-500">Editing</span>}
                            </p>
                            <button
                                onClick={closeSheet}
                                className="text-sm font-medium text-gray-400 dark:text-zinc-500"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-zinc-400">Amount</label>
                        <div className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-zinc-700 px-3 py-2.5">
                            <span className="text-gray-500 dark:text-zinc-400">₹</span>
                            <input
                                type="number"
                                inputMode="decimal"
                                autoFocus={sheetOpen}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full text-lg text-gray-900 bg-transparent dark:text-zinc-50 outline-none"
                            />
                        </div>

                        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

                        <button
                            onClick={handleSave}
                            disabled={submitting}
                            className="mt-4 w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900 disabled:opacity-50 transition-colors"
                        >
                            {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Add expense'}
                        </button>

                        {editingId && !confirmingDelete && (
                            <button
                                onClick={() => setConfirmingDelete(true)}
                                disabled={submitting}
                                className="mt-2 w-full rounded-lg py-3 text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-50"
                            >
                                Delete expense
                            </button>
                        )}

                        {editingId && confirmingDelete && (
                            <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-950/30 dark:border dark:border-red-900/50 p-3">
                                <p className="mb-3 text-sm text-red-700 dark:text-red-400">
                                    Delete this expense? This can't be undone.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setConfirmingDelete(false)}
                                        disabled={submitting}
                                        className="flex-1 rounded-lg bg-white border border-gray-200 dark:border-zinc-700 py-2 text-sm font-medium text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 shadow-sm disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={submitting}
                                        className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white disabled:opacity-50"
                                    >
                                        {submitting ? 'Deleting...' : 'Yes, delete'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
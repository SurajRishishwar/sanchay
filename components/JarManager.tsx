'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

type Jar = {
    id: string
    name: string
    type: 'ongoing' | 'event'
    budget_amount: number
}

export default function JarManager({ initialJars }: { initialJars: Jar[] }) {
    const router = useRouter()
    const { showToast } = useToast()

    // Create-form state
    const [showAddForm, setShowAddForm] = useState(false)
    const [newName, setNewName] = useState('')
    const [newType, setNewType] = useState<'ongoing' | 'event'>('ongoing')
    const [newBudget, setNewBudget] = useState('')
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    // Edit-in-place state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editBudget, setEditBudget] = useState('')
    const [saving, setSaving] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)

    // Delete state
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    function startEdit(jar: Jar) {
        setEditingId(jar.id)
        setEditName(jar.name)
        setEditBudget(String(jar.budget_amount))
        setEditError(null)
    }

    function cancelEdit() {
        setEditingId(null)
        setEditError(null)
    }

    async function handleCreate() {
        const budgetValue = parseFloat(newBudget)
        if (!newName.trim()) {
            setCreateError('Name is required')
            return
        }
        if (!budgetValue || budgetValue <= 0) {
            setCreateError('Budget must be greater than 0')
            return
        }

        setCreating(true)
        setCreateError(null)

        const supabase = createClient()
        const { error } = await supabase.from('jars').insert({
            name: newName.trim(),
            type: newType,
            budget_amount: budgetValue,
        })

        setCreating(false)

        if (error) {
            setCreateError(error.message)
            return
        }

        showToast('Jar created')
        setNewName('')
        setNewType('ongoing')
        setNewBudget('')
        router.refresh()
    }

    async function handleSaveEdit(jarId: string) {
        const budgetValue = parseFloat(editBudget)
        if (!editName.trim()) {
            setEditError('Name is required')
            return
        }
        if (!budgetValue || budgetValue <= 0) {
            setEditError('Budget must be greater than 0')
            return
        }

        setSaving(true)
        setEditError(null)

        const supabase = createClient()
        const { error } = await supabase
            .from('jars')
            .update({ name: editName.trim(), budget_amount: budgetValue })
            .eq('id', jarId)

        setSaving(false)

        if (error) {
            setEditError(error.message)
            return
        }

        showToast('Jar updated')
        setEditingId(null)
        router.refresh()
    }

    async function handleDelete(jarId: string) {
        setDeleting(true)
        setDeleteError(null)

        const supabase = createClient()
        const { error } = await supabase.from('jars').delete().eq('id', jarId)

        setDeleting(false)

        if (error) {
            setDeleteError(error.message)
            return
        }

        showToast('Jar deleted')
        setConfirmingDeleteId(null)
        router.refresh()
    }

    return (
        <div className="space-y-6">
            {/* Create new Jar */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
                <button
                    onClick={() => setShowAddForm((v) => !v)}
                    className="flex w-full items-center justify-between text-left"
                >
                    <p className="text-sm font-semibold text-gray-900">Create a new Jar</p>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={`h-5 w-5 text-gray-500 transition-transform ${showAddForm ? 'rotate-180' : ''}`}
                    >
                        <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>

                {showAddForm && (
                    <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g. Goa Trip"
                            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none"
                        />

                        <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
                        <div className="mb-3 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setNewType('ongoing')}
                                className={`flex-1 rounded-lg py-2 text-sm font-medium ${newType === 'ongoing'
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-700'
                                    }`}
                            >
                                Ongoing
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewType('event')}
                                className={`flex-1 rounded-lg py-2 text-sm font-medium ${newType === 'event'
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-700'
                                    }`}
                            >
                                Event
                            </button>
                        </div>
                        <p className="mb-3 text-xs text-gray-400">
                            Ongoing Jars reset their spend counter every month (e.g. Home, Pune).
                            Event Jars run until you close them (e.g. a trip or wedding).
                        </p>

                        <label className="mb-1 block text-xs font-medium text-gray-500">Budget</label>
                        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                            <span className="text-gray-500">₹</span>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={newBudget}
                                onChange={(e) => setNewBudget(e.target.value)}
                                placeholder="0"
                                className="w-full text-sm text-gray-900 outline-none"
                            />
                        </div>

                        {createError && <p className="mb-3 text-sm text-red-600">{createError}</p>}

                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Create Jar'}
                        </button>
                    </div>
                )}
            </div>

            {/* Existing Jars */}
            <div>
                <p className="mb-3 text-sm font-semibold text-gray-900">Existing Jars</p>

                {initialJars.length === 0 ? (
                    <div className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-sm">
                        No jars yet — create your first one above.
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {initialJars.map((jar) => (
                            <div key={jar.id} className="rounded-xl bg-white p-4 shadow-sm">
                                {editingId === jar.id ? (
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none"
                                        />
                                        <label className="mb-1 block text-xs font-medium text-gray-500">Budget</label>
                                        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                                            <span className="text-gray-500">₹</span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                value={editBudget}
                                                onChange={(e) => setEditBudget(e.target.value)}
                                                className="w-full text-sm text-gray-900 outline-none"
                                            />
                                        </div>

                                        {editError && <p className="mb-3 text-sm text-red-600">{editError}</p>}

                                        <div className="flex gap-2">
                                            <button
                                                onClick={cancelEdit}
                                                disabled={saving}
                                                className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleSaveEdit(jar.id)}
                                                disabled={saving}
                                                className="flex-1 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white disabled:opacity-50"
                                            >
                                                {saving ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                ) : confirmingDeleteId === jar.id ? (
                                    <div>
                                        <p className="mb-1 text-sm font-semibold text-gray-900">{jar.name}</p>
                                        <div className="rounded-lg bg-red-50 p-3">
                                            <p className="mb-3 text-sm text-red-700">
                                                Delete this Jar? This permanently removes its categories,
                                                memberships, and all logged expenses. This can&apos;t be undone.
                                            </p>
                                            {deleteError && (
                                                <p className="mb-3 text-sm text-red-600">{deleteError}</p>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setConfirmingDeleteId(null)}
                                                    disabled={deleting}
                                                    className="flex-1 rounded-lg bg-white py-2 text-sm font-medium text-gray-700 shadow-sm disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(jar.id)}
                                                    disabled={deleting}
                                                    className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white disabled:opacity-50"
                                                >
                                                    {deleting ? 'Deleting...' : 'Yes, delete'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <Link href={`/manager/jars/${jar.id}`} className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-semibold text-gray-900 hover:underline">{jar.name}</p>
                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                                                    {jar.type}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Budget: ₹{jar.budget_amount.toLocaleString('en-IN')}
                                            </p>
                                        </Link>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => startEdit(jar)}
                                                className="text-sm font-medium text-blue-600"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDeleteError(null)
                                                    setConfirmingDeleteId(jar.id)
                                                }}
                                                className="text-sm font-medium text-red-600"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
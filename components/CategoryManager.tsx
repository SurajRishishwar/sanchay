'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

type Category = {
    id: string
    name: string
    jar_id: string
    jar_name: string
}

type Jar = {
    id: string
    name: string
}

export default function CategoryManager({
    initialCategories,
    jars,
    preselectedJarId,
}: {
    initialCategories: Category[]
    jars: Jar[]
    preselectedJarId?: string
}) {
    const router = useRouter()
    const { showToast } = useToast()

    // Add-form visibility — collapsed by default so existing categories
    // stay front and center; auto-opens if arriving with a Jar preselected.
    const [showAddForm, setShowAddForm] = useState(false)

    // Create-form state
    const [newJarId, setNewJarId] = useState(preselectedJarId ?? jars[0]?.id ?? '')
    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    // Edit-in-place state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [saving, setSaving] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)

    // Delete state
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    function startEdit(category: Category) {
        setEditingId(category.id)
        setEditName(category.name)
        setEditError(null)
    }

    function cancelEdit() {
        setEditingId(null)
        setEditError(null)
    }

    async function handleCreate() {
        if (!newJarId) {
            setCreateError('Choose a Jar first')
            return
        }
        if (!newName.trim()) {
            setCreateError('Category name is required')
            return
        }

        setCreating(true)
        setCreateError(null)

        const supabase = createClient()
        const { error } = await supabase.from('categories').insert({
            jar_id: newJarId,
            name: newName.trim(),
        })

        setCreating(false)

        if (error) {
            setCreateError(error.message)
            return
        }

        showToast('Category created')
        setNewName('')
        router.refresh()
    }

    async function handleSaveEdit(categoryId: string) {
        if (!editName.trim()) {
            setEditError('Category name is required')
            return
        }

        setSaving(true)
        setEditError(null)

        const supabase = createClient()
        const { error } = await supabase
            .from('categories')
            .update({ name: editName.trim() })
            .eq('id', categoryId)

        setSaving(false)

        if (error) {
            setEditError(error.message)
            return
        }

        showToast('Category updated')
        setEditingId(null)
        router.refresh()
    }

    async function handleDelete(categoryId: string) {
        setDeleting(true)
        setDeleteError(null)

        const supabase = createClient()
        const { error } = await supabase.from('categories').delete().eq('id', categoryId)

        setDeleting(false)

        if (error) {
            setDeleteError(error.message)
            return
        }

        showToast('Category deleted')
        setConfirmingDeleteId(null)
        router.refresh()
    }

    // Group categories by Jar for display
    const grouped = jars.map((jar) => ({
        jar,
        categories: initialCategories.filter((c) => c.jar_id === jar.id),
    }))

    return (
        <div className="space-y-6">
            {/* Create new category */}
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-900">
                <button
                    onClick={() => setShowAddForm((v) => !v)}
                    className="flex w-full items-center justify-between text-left focus:outline-none"
                >
                    <p className="text-sm font-semibold text-gray-900 dark:text-zinc-50">Add a category</p>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={`h-5 w-5 text-gray-500 dark:text-zinc-400 transition-transform ${showAddForm ? 'rotate-180' : ''}`}
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
                        {jars.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-zinc-400">
                                Create a Jar first before adding categories.
                            </p>
                        ) : (
                            <>
                                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-zinc-400">Jar</label>
                                <select
                                    value={newJarId}
                                    onChange={(e) => setNewJarId(e.target.value)}
                                    className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-700"
                                >
                                    {jars.map((jar) => (
                                        <option key={jar.id} value={jar.id}>
                                            {jar.name}
                                        </option>
                                    ))}
                                </select>

                                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-zinc-400">Category name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Grocery"
                                    className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder-zinc-600 dark:focus:border-zinc-700"
                                />

                                {createError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{createError}</p>}

                                <button
                                    onClick={handleCreate}
                                    disabled={creating}
                                    className="w-full rounded-lg bg-gray-900 dark:bg-zinc-50 py-2.5 text-sm font-medium text-white dark:text-zinc-950 disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-zinc-200 transition"
                                >
                                    {creating ? 'Adding...' : 'Add Category'}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Existing categories, grouped by Jar */}
            <div className="grid gap-4 sm:grid-cols-2">
                {grouped.map(({ jar, categories }) => (
                    <div key={jar.id} className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-900">
                        <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-zinc-50">{jar.name}</p>

                        {categories.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-zinc-400">No categories yet.</p>
                        ) : (
                            <div
                                className="thin-scrollbar space-y-2 overflow-y-auto pr-1"
                                style={categories.length > 4 ? { maxHeight: '196px' } : undefined}
                            >
                                {categories.map((category) => (
                                    <div key={category.id}>
                                        {editingId === category.id ? (
                                            <div className="rounded-lg bg-gray-50 p-3 dark:bg-zinc-950/60 border border-transparent dark:border-zinc-800">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-700"
                                                />
                                                {editError && (
                                                    <p className="mb-2 text-sm text-red-600 dark:text-red-400">{editError}</p>
                                                )}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={cancelEdit}
                                                        disabled={saving}
                                                        className="flex-1 rounded-lg bg-gray-100 dark:bg-zinc-800 py-1.5 text-sm font-medium text-gray-700 dark:text-zinc-300 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleSaveEdit(category.id)}
                                                        disabled={saving}
                                                        className="flex-1 rounded-lg bg-gray-900 dark:bg-zinc-50 py-1.5 text-sm font-medium text-white dark:text-zinc-950 disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-zinc-200 transition"
                                                    >
                                                        {saving ? 'Saving...' : 'Save'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : confirmingDeleteId === category.id ? (
                                            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
                                                <p className="mb-2 text-sm text-red-700 dark:text-red-400">
                                                    Delete &quot;{category.name}&quot;? Past expenses keep this
                                                    category name; only new logging under it will stop.
                                                </p>
                                                {deleteError && (
                                                    <p className="mb-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
                                                )}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setConfirmingDeleteId(null)}
                                                        disabled={deleting}
                                                        className="flex-1 rounded-lg bg-white dark:bg-zinc-800 py-1.5 text-sm font-medium text-gray-700 dark:text-zinc-300 shadow-sm border border-gray-200 dark:border-transparent disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-zinc-700 transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(category.id)}
                                                        disabled={deleting}
                                                        className="flex-1 rounded-lg bg-red-600 py-1.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-red-700 transition"
                                                    >
                                                        {deleting ? 'Deleting...' : 'Yes, delete'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-zinc-950/40 px-3 py-2 border border-transparent dark:border-zinc-900">
                                                <span className="text-sm text-gray-900 dark:text-zinc-100">{category.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => startEdit(category)}
                                                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setDeleteError(null)
                                                            setConfirmingDeleteId(category.id)
                                                        }}
                                                        className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
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
                ))}

                {jars.length === 0 && (
                    <div className="rounded-xl bg-white p-4 text-sm text-gray-500 dark:text-zinc-400 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-900">
                        No jars exist yet.
                    </div>
                )}
            </div>
        </div>
    )
}
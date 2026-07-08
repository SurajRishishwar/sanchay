'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

export default function RoleToggle({
    userId,
    currentRole,
    isSelf,
}: {
    userId: string
    currentRole: string
    isSelf: boolean
}) {
    const router = useRouter()
    const { showToast } = useToast()
    const [confirming, setConfirming] = useState(false)
    const [saving, setSaving] = useState(false)

    const newRole = currentRole === 'manager' ? 'member' : 'manager'

    async function handleConfirm() {
        setSaving(true)

        const supabase = createClient()
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId)

        setSaving(false)

        if (error) {
            showToast('Could not update role: ' + error.message)
            return
        }

        showToast(`Role changed to ${newRole}`)
        setConfirming(false)
        router.refresh()
    }

    if (isSelf) {
        return (
            <div className="flex items-center justify-between">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium capitalize text-blue-700">
                    {currentRole}
                </span>
                <p className="text-xs text-gray-400">You can&apos;t change your own role.</p>
            </div>
        )
    }

    if (confirming) {
        return (
            <div className="rounded-lg bg-amber-50 p-3">
                <p className="mb-3 text-sm text-amber-800">
                    Change this user&apos;s role from <span className="font-medium capitalize">{currentRole}</span>{' '}
                    to <span className="font-medium capitalize">{newRole}</span>?
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => setConfirming(false)}
                        disabled={saving}
                        className="flex-1 rounded-lg bg-white py-2 text-sm font-medium text-gray-700 shadow-sm disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={saving}
                        className="flex-1 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Confirm'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between">
            <span
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    currentRole === 'manager'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                }`}
            >
                {currentRole}
            </span>
            <button
                onClick={() => setConfirming(true)}
                className="text-sm font-medium text-blue-600"
            >
                Make {newRole}
            </button>
        </div>
    )
}
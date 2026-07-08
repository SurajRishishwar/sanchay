'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

type Jar = {
    id: string
    name: string
    type: 'ongoing' | 'event'
}

type Membership = {
    jar_id: string
    is_default: boolean
}

export default function UserJarAssignment({
    targetUserId,
    jars,
    initialMemberships,
}: {
    targetUserId: string
    jars: Jar[]
    initialMemberships: Membership[]
}) {
    const router = useRouter()
    const { showToast } = useToast()
    const [busyJarId, setBusyJarId] = useState<string | null>(null)

    const membershipMap = new Map(initialMemberships.map((m) => [m.jar_id, m]))
    const hasAnyMembership = initialMemberships.length > 0

    async function handleToggle(jarId: string, isCurrentlyMember: boolean) {
        setBusyJarId(jarId)
        const supabase = createClient()

        if (isCurrentlyMember) {
            const { error } = await supabase
                .from('jar_members')
                .delete()
                .eq('jar_id', jarId)
                .eq('user_id', targetUserId)

            setBusyJarId(null)

            if (error) {
                showToast('Could not remove: ' + error.message)
                return
            }

            showToast('Removed from Jar')
            router.refresh()
            return
        }

        const { error } = await supabase.from('jar_members').insert({
            jar_id: jarId,
            user_id: targetUserId,
            is_default: !hasAnyMembership,
        })

        setBusyJarId(null)

        if (error) {
            showToast('Could not add: ' + error.message)
            return
        }

        showToast('Added to Jar')
        router.refresh()
    }

    async function handleSetDefault(jarId: string) {
        setBusyJarId(jarId)
        const supabase = createClient()

        // Unset any existing default for this user, then set the new one.
        const { error: clearError } = await supabase
            .from('jar_members')
            .update({ is_default: false })
            .eq('user_id', targetUserId)

        if (clearError) {
            setBusyJarId(null)
            showToast('Could not update default: ' + clearError.message)
            return
        }

        const { error } = await supabase
            .from('jar_members')
            .update({ is_default: true })
            .eq('jar_id', jarId)
            .eq('user_id', targetUserId)

        setBusyJarId(null)

        if (error) {
            showToast('Could not set default: ' + error.message)
            return
        }

        showToast('Default Jar updated')
        router.refresh()
    }

    if (jars.length === 0) {
        return <p className="text-sm text-gray-500">No jars exist yet.</p>
    }

    return (
        <div className="space-y-2">
            {jars.map((jar) => {
                const membership = membershipMap.get(jar.id)
                const isMember = !!membership
                const isBusy = busyJarId === jar.id

                return (
                    <div
                        key={jar.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                    >
                        <label className="flex flex-1 items-center gap-2">
                            <input
                                type="checkbox"
                                checked={isMember}
                                disabled={isBusy}
                                onChange={() => handleToggle(jar.id, isMember)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-900">{jar.name}</span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                                {jar.type}
                            </span>
                        </label>

                        {isMember && (
                            <button
                                onClick={() => handleSetDefault(jar.id)}
                                disabled={isBusy || membership?.is_default}
                                className={`text-xs font-medium ${
                                    membership?.is_default
                                        ? 'text-blue-600'
                                        : 'text-gray-400 hover:text-blue-600'
                                }`}
                            >
                                {membership?.is_default ? '★ Default' : '☆ Set default'}
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}   
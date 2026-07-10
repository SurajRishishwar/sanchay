'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Jar = { id: string; name: string }

const DOT_COLORS = ['#16A34A', '#2563EB', '#9333EA', '#DC2626', '#D97706', '#0D9488']

export default function JarSwitcher({
    jars,
    currentJarId,
    currentJarName,
}: {
    jars: Jar[]
    currentJarId: string
    currentJarName: string
}) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Single jar fallback heading (Added dark:text-zinc-50)
    if (jars.length <= 1) {
        return <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-50">{currentJarName}</h1>
    }

    function selectJar(jarId: string) {
        setOpen(false)
        startTransition(() => {
            router.push(`/?jar=${jarId}`)
        })
    }

    return (
        <div className="relative inline-block" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                disabled={isPending}
                /* Added dark:text-zinc-50 */
                className="flex items-center gap-1.5 text-lg font-medium text-gray-900 dark:text-zinc-50 disabled:opacity-50"
            >
                {currentJarName}
                {isPending ? (
                    /* Added dark:border-zinc-700 dark:border-t-zinc-400 */
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-zinc-700 dark:border-t-zinc-400" />
                ) : (
                    /* Added dark:text-zinc-500 */
                    <span className="text-xs text-gray-400 dark:text-zinc-500">▾</span>
                )}
            </button>

            {open && (
                /* Main Popover Overlay Panel (Added dark:border-zinc-800 dark:bg-zinc-900) */
                <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 shadow-lg">
                    {jars.map((jar, i) => (
                        <button
                            key={jar.id}
                            onClick={() => selectJar(jar.id)}
                            /* Added dark:hover:bg-zinc-800/60 */
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors"
                        >
                            <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }}
                            />
                            {/* Added dark:text-zinc-300 */}
                            <span className="flex-1 text-gray-700 dark:text-zinc-300">{jar.name}</span>
                            {/* Added dark:text-zinc-50 */}
                            {jar.id === currentJarId && <span className="text-gray-900 dark:text-zinc-50">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
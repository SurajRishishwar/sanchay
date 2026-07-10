'use client'

import { useState, useEffect, useRef, useTransition } from 'react' // 1. Added useTransition
import { useRouter } from 'next/navigation'

const MONTH_NAMES = [
    { label: 'January', value: '01' },
    { label: 'February', value: '02' },
    { label: 'March', value: '03' },
    { label: 'April', value: '04' },
    { label: 'May', value: '05' },
    { label: 'June', value: '06' },
    { label: 'July', value: '07' },
    { label: 'August', value: '08' },
    { label: 'September', value: '09' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
]

export default function MonthDropdownSelector({
    jarId,
    activeMonth,
    currentYear
}: {
    jarId: string
    activeMonth: string
    currentYear: number
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition() // 2. Initialize the transition hook
    const containerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    const realToday = new Date()
    const activeMonthObj = MONTH_NAMES.find((m) => m.value === activeMonth)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    function handleMonthSelect(monthValue: string, isFuture: boolean) {
        if (isFuture) return
        
        setIsOpen(false)
        
        // 3. Wrap router.push in startTransition to explicitly flash the loading spinner
        startTransition(() => {
            router.push(`/history?jar=${jarId}&month=${monthValue}`)
        })
    }

    return (
        <div ref={containerRef} className="relative mb-6">
            
            {/* ------------------------------------------------------------- */}
            {/* MATCHING CIRCLE LOADING EFFECT OVERLAY                        */}
            {/* ------------------------------------------------------------- */}
            {isPending && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 dark:bg-zinc-950/80 backdrop-blur-sm transition-colors duration-200">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600 dark:border-zinc-800 dark:border-t-zinc-400" />
                </div>
            )}
            {/* ------------------------------------------------------------- */}

            {/* Dropdown Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 text-sm font-medium text-gray-900 dark:text-zinc-100"
            >
                <span>{activeMonthObj?.label} {currentYear}</span>
                
                <svg
                    className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {/* Floating Months Overlay Grid */}
            {isOpen && (
                <div className="absolute z-30 mt-2 w-full rounded-xl border border-gray-100 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="grid grid-cols-3 gap-1">
                        {MONTH_NAMES.map((m) => {
                            const monthIdx = parseInt(m.value, 10) - 1
                            const isFuture = monthIdx > realToday.getMonth()
                            const isSelected = activeMonth === m.value

                            return (
                                <button
                                    key={m.value}
                                    disabled={isFuture || isPending}
                                    onClick={() => handleMonthSelect(m.value, isFuture)}
                                    className={`rounded-lg py-2.5 text-center text-xs font-semibold transition-all ${
                                        isFuture
                                            ? 'cursor-not-allowed text-gray-300 bg-gray-50/50 dark:text-zinc-700 dark:bg-zinc-950/20 line-through'
                                            : isSelected
                                            ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-600'
                                            : 'text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                    }`}
                                >
                                    {m.label.substring(0, 3)}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface MonthDropdownPickerProps {
    currentYear: number
    selectedMonthIndex: number
    jarId: string // <-- Added so the component can handle routing directly
}

export default function MonthDropdownPicker({
    currentYear,
    selectedMonthIndex,
    jarId,
}: MonthDropdownPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()
    const [isPending, startTransition] = useTransition() // Central page router loading channel

    const now = new Date()
    const systemYear = now.getFullYear()
    const systemMonthIndex = now.getMonth()

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]

    const fullMonthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const handleSelectMonth = (monthIndex: number) => {
        setIsOpen(false)
        const nextMonthStr = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}`

        // This instantly triggers the transition channel while Next.js fetches data in the background
        startTransition(() => {
            router.push(`/manager/jars/${jarId}?month=${nextMonthStr}`)
        })
    }

    return (
        <>
            {/* CENTRAL PAGE SPINNER OVERLAY */}
            {isPending && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-opacity duration-200">
                    <div className="w-9 h-9 border-4 border-zinc-600 border-t-zinc-100 rounded-full animate-spin"></div>
                </div>
            )}

            {/* Dropdown Container Element */}
            <div className="relative inline-block text-left w-full sm:w-auto z-20">
                {/* Dropdown Toggle Button */}
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex w-full justify-between items-center gap-x-6 sm:gap-x-8 rounded-xl bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-zinc-100 shadow-sm border border-gray-200 dark:border-zinc-800/80 hover:bg-gray-50 dark:hover:bg-zinc-800/50 active:scale-98 transition-all min-w-[150px] sm:min-w-[160px] cursor-pointer disabled:opacity-50"
                >
                    <span>{fullMonthNames[selectedMonthIndex]} {currentYear}</span>
                    <svg
                        className={`h-4 w-4 text-gray-400 dark:text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>

                {/* Dropdown Matrix Overlay (Responsive Mobile Alignment Fix) */}
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

                        {/* Note the use of left-0 right-0 on mobile to fill layout breaks safely, snapping into sm:right-0 sm:left-auto on desktops */}
                        <div className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 min-w-[280px] sm:w-96 origin-top-right rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-xl border border-gray-100 dark:border-zinc-800/80 focus:outline-none z-20">
                            <div className="text-center text-xs font-medium text-gray-400 dark:text-zinc-500 mb-4 tracking-wide">
                                Select Month — {currentYear}
                            </div>

                            <div className="grid grid-cols-3 gap-x-3 gap-y-2.5">
                                {months.map((month, idx) => {
                                    const isSelected = idx === selectedMonthIndex
                                    const isFutureMonth =
                                        currentYear > systemYear ||
                                        (currentYear === systemYear && idx > systemMonthIndex)

                                    return (
                                        <button
                                            key={month}
                                            type="button"
                                            disabled={isFutureMonth}
                                            onClick={() => handleSelectMonth(idx)}
                                            className={`rounded-xl py-3 text-sm font-medium transition-all ${isFutureMonth
                                                    ? 'text-gray-200 dark:text-zinc-800 cursor-not-allowed bg-gray-50/50 dark:bg-zinc-950/20'
                                                    : isSelected
                                                        ? 'bg-blue-600 text-white shadow-md font-semibold cursor-pointer'
                                                        : 'text-gray-400 dark:text-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-800/40 hover:text-gray-800 dark:hover:text-zinc-200 cursor-pointer'
                                                }`}
                                        >
                                            {month}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}
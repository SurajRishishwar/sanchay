'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'

interface MonthSelectorProps {
  defaultValue: string
  max: string
}

export default function MonthSelector({ defaultValue, max }: MonthSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedMonth = e.target.value
    if (!selectedMonth) return

    startTransition(() => {
      router.push(`${pathname}?month=${selectedMonth}`)
    })
  }

  return (
    <div className="flex items-center">
      <input 
        type="month" 
        name="month"
        defaultValue={defaultValue}
        max={max}
        onChange={handleMonthChange}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm font-medium text-gray-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
      />

      {/* Full screen center spinner mask */}
      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-opacity duration-200">
          <div className="w-9 h-9 border-4 border-zinc-600 border-t-zinc-100 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
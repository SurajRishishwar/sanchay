'use client'

export default function DownloadHistoryButton({
    expenses,
    monthLabel,
    year,
    totalAmount,
    isCurrentMonth,
    disabled // 1. Added dynamic disabled prop
}: {
    expenses: Array<{ category_name: string; entry_date: string; amount: string | number }>
    monthLabel: string
    year: number
    totalAmount: number
    isCurrentMonth: boolean
    disabled?: boolean
}) {
    function exportToExcel() {
        if (disabled || !expenses || expenses.length === 0) return

        const headers = ['Category', 'Date', 'Amount']
        const rows = expenses.map(item => [
            `"${item.category_name.replace(/"/g, '""')}"`,
            `"${item.entry_date}"`,
            item.amount
        ])

        const summaryLabel = isCurrentMonth 
            ? `Total Expenses (Sum Till Today)` 
            : `Total Monthly Expenses`

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(',')),
            '',
            `${summaryLabel},,${totalAmount}`
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        
        const fileName = `Expenses_${monthLabel.replace(/\s+/g, '_')}_${year}.csv`
        link.setAttribute('href', url)
        link.setAttribute('download', fileName)
        link.style.visibility = 'hidden'
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <button
            onClick={exportToExcel}
            disabled={disabled} // 2. Apply native disabled state
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:disabled:hover:bg-zinc-950"
        >
            <svg 
                className="h-3.5 w-3.5" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth="2" 
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Excel Report
        </button>
    )
}
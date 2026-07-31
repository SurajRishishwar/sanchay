'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DownloadExcelButtonProps {
  jarId: string
  jarName: string
  jarType: string
  budget: number
  selectedMonth: string
  hasExpenses: boolean
}

export default function DownloadExcelButton({ 
  jarId, 
  jarName, 
  jarType, 
  budget, 
  selectedMonth,
  hasExpenses 
}: DownloadExcelButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const downloadExcelCsv = async () => {
    if (!hasExpenses) return
    setIsDownloading(true)
    try {
      const supabase = createClient()
      
      let query = supabase
        .from('expenses')
        .select('entry_date, category_name, user_name, amount')
        .eq('jar_id', jarId)
        .order('entry_date', { ascending: false })

      let timeframeLabel = 'All Time'

      if (jarType === 'ongoing') {
        const [year, month] = selectedMonth.split('-').map(Number)
        
        const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

        query = query.gte('entry_date', startOfMonth).lte('entry_date', endOfMonth)
        
        const readableMonth = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        timeframeLabel = readableMonth
      }

      const { data: expenses, error } = await query
      if (error) throw error

      const totalExpense = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

      // 1. Group expenses by category and sum amounts
      const categoryTotals = (expenses ?? []).reduce((acc, curr) => {
        const catName = curr.category_name || 'Uncategorized'
        const amount = Number(curr.amount) || 0
        acc[catName] = (acc[catName] || 0) + amount
        return acc
      }, {} as Record<string, number>)

      // 2. Build CSV rows
      const csvRows = [
        `"Jar Report"`,
        `"Jar Name:","${jarName}"`,
        `"Timeframe:","${timeframeLabel}"`,
        `"Total Budget (₹):",${budget}`,
        `"Total Expense (₹):",${totalExpense}`,
        `"Remaining Balance (₹):",${budget - totalExpense}`,
        ``, 
        `"--- Category Summary ---"`,
        `"Category","Total Amount (₹)"`
      ]

      // Add category summary rows (sorted by highest spend first)
      Object.entries(categoryTotals)
        .sort(([, amountA], [, amountB]) => amountB - amountA)
        .forEach(([catName, sumAmount]) => {
          csvRows.push([
            `"${catName.replace(/"/g, '""')}"`,
            sumAmount
          ].join(','))
        })

      csvRows.push(
        ``,
        `"--- Line Item Entries ---"`,
        `"Date","User Name","Category","Amount (₹)"`
      )

      // Add detailed line items
      if (expenses && expenses.length > 0) {
        expenses.forEach(e => {
          csvRows.push([
            `"${e.entry_date}"`,
            `"${e.user_name.replace(/"/g, '""')}"`,
            `"${e.category_name.replace(/"/g, '""')}"`,
            e.amount
          ].join(','))
        })
      }

      const csvContent = '\uFEFF' + csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${jarName.toLowerCase().replace(/\s+/g, '_')}_${selectedMonth}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to generate spreadsheet file.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <button
      onClick={downloadExcelCsv}
      disabled={isDownloading || !hasExpenses}
      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:text-gray-400 dark:disabled:text-zinc-600 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
    >
      {isDownloading ? 'Exporting...' : 'Download Excel'}
    </button>
  )
}
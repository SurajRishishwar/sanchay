'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

type ExpenseItem = {
  id: string
  amount: number
  category_name: string
  entry_date: string
}

type AdvanceItem = {
  id: string
  amount: number
  note: string | null
  created_at: string
}

type Member = {
  user_id: string
  user_name: string
  totalSpent: number
  totalAdvances: number
  remainingDue: number
  settled: boolean
  items: ExpenseItem[]
  advancesList: AdvanceItem[]
}

type JarGroup = {
  jar: { id: string; name: string }
  members: Member[]
}

interface SettlementManagerProps {
  jarGroups: JarGroup[]
  selectedDate?: string // ISO string or date string representing the selected month context
}

export default function SettlementManager({
  jarGroups,
  selectedDate,
}: SettlementManagerProps) {
  const router = useRouter()
  const { showToast } = useToast()

  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  // Modal states
  const [addModal, setAddModal] = useState<{ jarId: string; userId: string; userName: string } | null>(null)
  const [editModal, setEditModal] = useState<{ advanceId: string; amount: number; note: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [advanceAmount, setAdvanceAmount] = useState('')
  const [advanceNote, setAdvanceNote] = useState('')

  // Helper to determine target timestamp based on context date
  function getTimestamp() {
    if (!selectedDate) return new Date().toISOString()
    const targetDate = new Date(selectedDate)
    const now = new Date()

    // If selected month is current month, use exact current time; otherwise use the target date context
    if (
      targetDate.getFullYear() === now.getFullYear() &&
      targetDate.getMonth() === now.getMonth()
    ) {
      return now.toISOString()
    }

    return targetDate.toISOString()
  }

  // Add Advance Handler
  async function handleAddAdvance(jarId: string, userId: string) {
    if (!advanceAmount || Number(advanceAmount) <= 0) {
      showToast('Please enter a valid amount')
      return
    }

    const key = `${jarId}:${userId}`
    setBusyKey(key)

    const supabase = createClient()
    const { error } = await supabase.from('jar_advances').insert({
      jar_id: jarId,
      user_id: userId,
      amount: Number(advanceAmount),
      note: advanceNote.trim() || null,
      created_at: getTimestamp(),
    })

    setBusyKey(null)

    if (error) {
      showToast('Could not add advance: ' + error.message)
      return
    }

    showToast('Advance added successfully')
    closeModal()
    router.refresh()
  }

  // Update Existing Advance Handler
  async function handleUpdateAdvance() {
    if (!editModal || !advanceAmount || Number(advanceAmount) <= 0) {
      showToast('Please enter a valid amount')
      return
    }

    setBusyKey(editModal.advanceId)

    const supabase = createClient()
    const { error } = await supabase
      .from('jar_advances')
      .update({
        amount: Number(advanceAmount),
        note: advanceNote.trim() || null,
      })
      .eq('id', editModal.advanceId)

    setBusyKey(null)

    if (error) {
      showToast('Could not update advance: ' + error.message)
      return
    }

    showToast('Advance updated')
    closeModal()
    router.refresh()
  }

  // Delete Advance Handler
  async function handleDeleteAdvance() {
    if (!editModal) return

    setBusyKey(editModal.advanceId)

    const supabase = createClient()
    const { error } = await supabase
      .from('jar_advances')
      .delete()
      .eq('id', editModal.advanceId)

    setBusyKey(null)

    if (error) {
      showToast('Could not delete advance: ' + error.message)
      return
    }

    showToast('Advance deleted')
    closeModal()
    router.refresh()
  }

  // Settle Due Handler
  async function handleSettleDue(jarId: string, userId: string, dueAmount: number) {
    if (dueAmount <= 0) return

    const key = `${jarId}:${userId}`
    setBusyKey(key)

    const supabase = createClient()
    const { error } = await supabase.from('jar_advances').insert({
      jar_id: jarId,
      user_id: userId,
      amount: dueAmount,
      note: 'Settlement Payment',
      created_at: getTimestamp(),
    })

    setBusyKey(null)

    if (error) {
      showToast('Could not settle due: ' + error.message)
      return
    }

    showToast('Settled due successfully')
    router.refresh()
  }

  function closeModal() {
    setAddModal(null)
    setEditModal(null)
    setIsDeleting(false)
    setAdvanceAmount('')
    setAdvanceNote('')
  }

  const hasAnyMembers = jarGroups.some((g) => g.members.length > 0)

  if (!hasAnyMembers) {
    return (
      <div className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-sm dark:bg-zinc-900 dark:text-zinc-400">
        No expenses or advances logged for any member this month.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {jarGroups.map(({ jar, members }) => {
        if (members.length === 0) return null

        return (
          <div key={jar.id} className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-zinc-100">{jar.name}</p>

            <div className="space-y-3">
              {members.map((m) => {
                const key = `${jar.id}:${m.user_id}`
                const isBusy = busyKey === key

                return (
                  <div key={key} className="rounded-lg bg-gray-50 p-3 dark:bg-zinc-800/50">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        onClick={() => setExpandedKey(expandedKey === key ? null : key)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-sm font-medium text-gray-900 hover:underline dark:text-zinc-100">
                          {m.user_name}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                          Spent: <span className="font-medium text-gray-700 dark:text-zinc-300">₹{m.totalSpent.toLocaleString('en-IN')}</span> · 
                          Advances: <span className="font-medium text-gray-700 dark:text-zinc-300">₹{m.totalAdvances.toLocaleString('en-IN')}</span> · 
                          Due: <span className={`font-semibold ${m.remainingDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                            ₹{m.remainingDue.toLocaleString('en-IN')}
                          </span>
                        </p>
                      </button>

                      <div className="flex items-center gap-2">
                        {!m.settled && (
                          <button
                            onClick={() => {
                              setAddModal({ jarId: jar.id, userId: m.user_id, userName: m.user_name })
                              setAdvanceAmount('')
                              setAdvanceNote('')
                            }}
                            disabled={isBusy}
                            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                          >
                            + Advance
                          </button>
                        )}

                        {m.settled ? (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                            ✓ Settled
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSettleDue(jar.id, m.user_id, m.remainingDue)}
                            disabled={isBusy}
                            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          >
                            {isBusy ? 'Settling...' : `Settle Due (₹${m.remainingDue.toLocaleString('en-IN')})`}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Breakdown */}
                    {expandedKey === key && (
                      <div className="mt-3 space-y-3 border-t border-gray-200 pt-3 dark:border-zinc-700">
                        {/* Advances List */}
                        {m.advancesList.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Advances Given</p>
                            {m.advancesList.map((adv) => (
                              <div key={adv.id} className="flex items-center justify-between rounded border border-gray-100 bg-white p-2 text-xs dark:border-zinc-700/50 dark:bg-zinc-800">
                                <div>
                                  <span className="font-medium text-gray-800 dark:text-zinc-200">
                                    ₹{adv.amount.toLocaleString('en-IN')}
                                  </span>
                                  {adv.note && <span className="ml-2 italic text-gray-500">({adv.note})</span>}
                                  <span className="ml-2 text-[10px] text-gray-400">
                                    {new Date(adv.created_at).toLocaleDateString('en-IN')}
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    setEditModal({ advanceId: adv.id, amount: adv.amount, note: adv.note || '' })
                                    setAdvanceAmount(String(adv.amount))
                                    setAdvanceNote(adv.note || '')
                                  }}
                                  className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                                >
                                  Edit
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Expense Items List */}
                        {m.items.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Expenses Logged</p>
                            {m.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-gray-700 dark:text-zinc-300">{item.category_name}</span>
                                  <span className="ml-2 text-gray-400 dark:text-zinc-500">
                                    {new Date(item.entry_date).toLocaleDateString('en-IN')}
                                  </span>
                                </div>
                                <span className="font-medium text-gray-900 dark:text-zinc-100">
                                  ₹{item.amount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Modal for Adding, Editing, or Deleting an Advance */}
      {(addModal || editModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
              {addModal ? `Add Advance for ${addModal.userName}` : 'Edit Advance Amount'}
            </h3>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300">Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  disabled={isDeleting}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300">
                  Note <span className="font-normal text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Beginning of month cash"
                  value={advanceNote}
                  onChange={(e) => setAdvanceNote(e.target.value)}
                  disabled={isDeleting}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Action Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-zinc-800">
              {/* Left Side: Delete Button (Only when Editing) */}
              {editModal ? (
                isDeleting ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleDeleteAdvance}
                      className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setIsDeleting(false)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsDeleting(true)}
                    className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Delete Advance
                  </button>
                )
              ) : (
                <div />
              )}

              {/* Right Side: Cancel & Save Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={closeModal}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (addModal) {
                      handleAddAdvance(addModal.jarId, addModal.userId)
                    } else {
                      handleUpdateAdvance()
                    }
                  }}
                  className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {addModal ? 'Save Advance' : 'Update Advance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
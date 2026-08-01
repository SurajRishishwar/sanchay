'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface TaskItem {
  id: string
  user_id: string
  task_name: string
  end_date: string
  is_completed: boolean
}

interface TaskProps {
  initialTasks: TaskItem[]
  userId: string
}

export default function Task({ initialTasks, userId }: TaskProps) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks)
  const [taskName, setTaskName] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()

  // Handle Create Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskName.trim() || !endDate) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          task_name: taskName.trim(),
          end_date: endDate,
          is_completed: false,
        })
        .select('*')
        .single()

      if (error) throw error

      if (data) {
        setTasks((prev) => [...prev, data].sort((a, b) => a.end_date.localeCompare(b.end_date)))
        setTaskName('')
        setEndDate('')
      }
    } catch (err) {
      console.error('Error adding task:', err)
      alert('Failed to add task.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Toggle Completion
  const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
    // Optimistic UI Update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_completed: !currentStatus } : t))
    )

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: !currentStatus })
        .eq('id', taskId)

      if (error) throw error
    } catch (err) {
      console.error('Error updating task:', err)
      // Revert status on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_completed: currentStatus } : t))
      )
    }
  }

  // Handle Delete Task
  const handleDeleteTask = async (taskId: string) => {
    // Optimistic UI Update
    setTasks((prev) => prev.filter((t) => t.id !== taskId))

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error
    } catch (err) {
      console.error('Error deleting task:', err)
      alert('Failed to delete task.')
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      {/* Task Creation Form Card */}
      <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-zinc-50">Create New Task</h2>
        <form onSubmit={handleAddTask} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
              Task Name
            </label>
            <input
              type="text"
              required
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Verify July Milk Ledger"
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-full sm:w-44">
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Adding...' : 'Add Task'}
          </button>
        </form>
      </div>

      {/* Tasks Listing Card */}
      <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-900">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-zinc-50">Tasks & To-Dos</h2>

        {tasks.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800 space-y-3">
            {tasks.map((task, index) => {
              const isOverdue = !task.is_completed && task.end_date < todayStr

              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between gap-3 text-sm ${index !== 0 ? 'pt-3' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(task.id, task.is_completed)}
                      className={`h-5 w-5 rounded border flex items-center justify-center transition shrink-0 cursor-pointer ${
                        task.is_completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 dark:border-zinc-700 hover:border-blue-500'
                      }`}
                    >
                      {task.is_completed && (
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                          <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                        </svg>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-medium truncate ${
                          task.is_completed
                            ? 'line-through text-gray-400 dark:text-zinc-600'
                            : 'text-gray-900 dark:text-zinc-100'
                        }`}
                      >
                        {task.task_name}
                      </p>
                      <p
                        className={`text-xs ${
                          isOverdue
                            ? 'text-red-500 font-medium'
                            : 'text-gray-500 dark:text-zinc-400'
                        }`}
                      >
                        Due by {new Date(task.end_date).toLocaleDateString('en-IN')}
                        {isOverdue && ' (Overdue)'}
                      </p>
                    </div>
                  </div>

                  {/* Delete Action */}
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-xs text-red-500 hover:underline shrink-0 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-zinc-400 py-2">No tasks logged yet.</p>
        )}
      </div>
    </div>
  )
}
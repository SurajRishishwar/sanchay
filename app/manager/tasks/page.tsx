import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Task from '@/components/Tasks'

export default async function ManagerTasksPage() {
  const supabase = await createClient()

  // 1. Verify User Session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Verify Manager Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'manager') redirect('/')

  // 3. Fetch Tasks for Manager
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('end_date', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
      <Navbar isManager />
      
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">

          {/* Header */}
          <div className="mb-6 flex items-center justify-between border-b border-gray-100 dark:border-zinc-900/80 pb-5">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-50 tracking-tight">
                Manager Tasks & To-Dos
              </h1>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                Track personal actions, deadlines, and reminders.
              </p>
            </div>
            <Link 
              href="/manager/jars" 
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              Back
            </Link>
          </div>

          {/* Interactive Task Component */}
          <Task initialTasks={tasks ?? []} userId={user.id} />

        </div>
      </div>
    </div>
  )
}
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

// import ChangePasswordForm from '@/components/ChangePasswordForm'
 
export default async function ProfilePage() {
  const supabase = await createClient()
 
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
 
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()
 
  const { data: memberships } = await supabase
    .from('jar_members')
    .select('is_default, jars(id, name)')
    .eq('user_id', user.id)
 
  const jars = (memberships ?? []).map((m) => ({
    ...(m.jars as unknown as { id: string; name: string }),
    isDefault: m.is_default,
  }))
 
  return (
    /* Added dark:bg-zinc-950 and transition effects */
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
      <Navbar isManager={profile?.role === 'manager'} />
      <div className="px-4 py-6">
        <div className="mx-auto max-w-md">
          <div className="mb-4 flex items-center justify-between">
            {/* Added dark:text-zinc-50 */}
            <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-50">Your profile</h1>
            {/* Added dark:text-blue-400 */}
            <Link href="/" className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Back
            </Link>
          </div>
 
          {/* Section 1: Profile Info Card (Added dark:bg-zinc-900) */}
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
            <div className="mb-3">
              {/* Added dark:text-zinc-400 */}
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Name</p>
              {/* Added dark:text-zinc-100 */}
              <p className="text-sm text-gray-900 dark:text-zinc-100">{profile?.full_name ?? '—'}</p>
            </div>
            <div className="mb-3">
              {/* Added dark:text-zinc-400 */}
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Email</p>
              {/* Added dark:text-zinc-100 */}
              <p className="text-sm text-gray-900 dark:text-zinc-100">{profile?.email ?? user.email}</p>
            </div>
            <div>
              {/* Added dark:text-zinc-400 */}
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Role</p>
              {/* Added dark:text-zinc-100 */}
              <p className="text-sm capitalize text-gray-900 dark:text-zinc-100">{profile?.role ?? 'member'}</p>
            </div>
          </div>
 
          {/* Section 2: Jars List Card (Added dark:bg-zinc-900) */}
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
            {/* Added dark:text-zinc-50 */}
            <p className="mb-3 text-sm font-medium text-gray-900 dark:text-zinc-50">Your jars</p>
            {jars.length === 0 ? (
              
              <p className="text-sm text-gray-500 dark:text-zinc-500">You're not assigned to any jar yet.</p>
            ) : (
              <div className="space-y-2">
                {jars.map((jar) => (
                  <div
                    key={jar.id}
                    /* Added dark:bg-zinc-800/50 */
                    className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-zinc-800/50 px-3 py-2"
                  >
                    {/* Added dark:text-zinc-200 */}
                    <span className="text-sm text-gray-800 dark:text-zinc-200">{jar.name}</span>
                    {jar.isDefault && (
                      /* Added dark:bg-zinc-800 dark:text-zinc-400 */
                      <span className="rounded-full bg-gray-200 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-zinc-400">
                        Default
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
 
          {/* Section 3: Actions (Added dark:bg-zinc-900) */}
          <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
            {/* Added dark:text-zinc-50 */}
            <p className="mb-3 text-sm font-medium text-gray-900 dark:text-zinc-50">Change password - an upcoming feature</p>
            {/* <ChangePasswordForm /> */}
          </div>
        </div>
      </div>
    </div>
  )
}
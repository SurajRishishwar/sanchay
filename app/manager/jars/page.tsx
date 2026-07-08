import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import JarManager from '@/components/JarManager'

export default async function ManagerJarsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'manager') redirect('/')

  const { data: jars } = await supabase
    .from('jars')
    .select('id, name, type, budget_amount')
    .order('created_at')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isManager />
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-gray-900">Jars</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create new Jars and edit budgets.
              </p>
            </div>
            <Link
              href="/manager"
              className="text-sm font-medium text-blue-600"
            >
              Back
            </Link>
          </div>

          <JarManager initialJars={jars ?? []} />
        </div>
      </div>
    </div>
  )
}
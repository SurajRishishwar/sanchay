import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import CategoryManager from '@/components/CategoryManager'

export default async function ManagerCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ jar?: string }>
}) {
  const { jar: preselectedJarId } = await searchParams
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
    .select('id, name')
    .order('name')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, jar_id, jars(name)')
    .order('created_at')

  const normalizedCategories = (categories ?? []).map((c) => {
    const jar = Array.isArray(c.jars) ? c.jars[0] : c.jars
    return {
      id: c.id,
      name: c.name,
      jar_id: c.jar_id,
      jar_name: jar?.name ?? 'Unknown Jar',
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
      <Navbar isManager />
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-50">
                Categories
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                Manage categories across all Jars.
              </p>
            </div>
            <Link 
              href="/manager" 
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Back
            </Link>
          </div>

          <CategoryManager
            initialCategories={normalizedCategories}
            jars={jars ?? []}
            preselectedJarId={preselectedJarId}
          />
        </div>
      </div>
    </div>
  )
}
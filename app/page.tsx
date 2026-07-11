import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EntryScreen from '@/components/EntryScreen'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ jar?: string }>
}) {
  const { jar: requestedJarId } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Updated query: Fetching the 'type' attribute from jars relational table structure
  const { data: memberships } = await supabase
    .from('jar_members')
    .select('jar_id, is_default, jars(id, name, type)')
    .eq('user_id', user.id)

  if (!memberships || memberships.length === 0) {
    if (profile?.role === 'manager') redirect('/manager')

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-lg font-medium text-gray-900">No jar assigned yet</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ask your manager to add you to a jar before you can log expenses.
          </p>
        </div>
      </div>
    )
  }

  const allJars = memberships.map((m) => m.jars as unknown as { id: string; name: string; type: string })

  const requestedMembership = requestedJarId
    ? memberships.find((m) => m.jar_id === requestedJarId)
    : undefined

  const defaultMembership = memberships.find((m) => m.is_default) ?? memberships[0]
  const activeMembership = requestedMembership ?? defaultMembership

  const jar = activeMembership.jars as unknown as { id: string; name: string; type: 'ongoing' | 'event' }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('jar_id', jar.id)
    .order('name')

  const today = new Date().toISOString().split('T')[0]

  const { data: todaysExpenses } = await supabase
    .from('expenses')
    .select('id, amount, category_name, user_name, user_id')
    .eq('jar_id', jar.id)
    .eq('entry_date', today)
    .order('created_at', { ascending: false })

  return (
    <EntryScreen
      jarId={jar.id}
      jarName={jar.name}
      jarType={jar.type} // <-- Added new layout flag prop here
      allJars={allJars}
      userId={user.id}
      userName={profile?.full_name ?? 'You'}
      isManager={profile?.role === 'manager'}
      categories={categories ?? []}
      initialActivity={(todaysExpenses ?? []).map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        category: e.category_name,
        name: e.user_name,
        ownerId: e.user_id,
      }))}
    />
  )
}
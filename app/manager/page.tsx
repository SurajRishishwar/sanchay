import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

type JarRow = {
  id: string
  name: string
  type: 'ongoing' | 'event'
  budget_amount: number
}

export default async function ManagerPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  // Only Managers get past this point — Members are sent back
  // to their normal entry screen.
  if (!profile || profile.role !== 'manager') redirect('/')

  const { data: jars } = await supabase
    .from('jars')
    .select('id, name, type, budget_amount')
    .order('created_at')

  const jarList = (jars ?? []) as JarRow[]

  // Spend so far, per Jar. Ongoing Jars only count the current
  // month; Event Jars count everything since they never reset.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const jarSummaries = await Promise.all(
    jarList.map(async (jar) => {
      let query = supabase
        .from('expenses')
        .select('amount')
        .eq('jar_id', jar.id)

      if (jar.type === 'ongoing') {
        query = query.gte('entry_date', monthStart)
      }

      const { data: expenses } = await query

      const spent = (expenses ?? []).reduce(
        (sum, e) => sum + Number(e.amount),
        0
      )
      const remaining = jar.budget_amount - spent
      const isOver = remaining < 0

      return { ...jar, spent, remaining: Math.abs(remaining), isOver }
    })
  )

  const totalBudget = jarSummaries.reduce((s, j) => s + j.budget_amount, 0)
  const totalSpent = jarSummaries.reduce((s, j) => s + j.spent, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isManager />
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-gray-900">
                Manager overview
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Welcome{profile.full_name ? `, ${profile.full_name}` : ''} — every
                Jar across Sanchay, at a glance.
              </p>
            </div>

          </div>

          {/* Overall summary */}
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Total budget (this cycle)
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  ₹{totalBudget.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Total spent
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  ₹{totalSpent.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Per-Jar cards */}
          {jarList.length === 0 ? (
            <div className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-sm">
              No jars yet.{' '}
              <Link  href="/manager/jars" className="font-medium text-blue-600">
                Create your first Jar
              </Link>
              .
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {jarSummaries.map((jar) => (
                <Link 
                  href={`/manager/jars/${jar.id}`}
                  key={jar.id}
                  className="block rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      {jar.name}
                    </p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                      {jar.type}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="text-sm font-medium text-gray-900">
                        ₹{jar.budget_amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Spent</p>
                      <p className="text-sm font-medium text-gray-900">
                        ₹{jar.spent.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {jar.isOver ? 'Over by' : 'Remaining'}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          jar.isOver ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        ₹{jar.remaining.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Placeholders for what's coming next on the manager side */}
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">
              Coming next to this dashboard
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-500">
              <li>Manage categories per Jar</li>
              <li>Assign members to Jars</li>
              <li>Recurring expense setup</li>
              <li>Full audit trail</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
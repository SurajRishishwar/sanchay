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
<div className="min-h-screen bg-gray-50">
<Navbar isManager={profile?.role === 'manager'} />
<div className="px-4 py-6">
<div className="mx-auto max-w-md">
<div className="mb-4 flex items-center justify-between">
<h1 className="text-lg font-medium text-gray-900">Your profile</h1>
<Link href="/" className="text-sm font-medium text-blue-600">

              Back
</Link>
</div>
 
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
<div className="mb-3">
<p className="text-xs font-medium text-gray-500">Name</p>
<p className="text-sm text-gray-900">{profile?.full_name ?? '—'}</p>
</div>
<div className="mb-3">
<p className="text-xs font-medium text-gray-500">Email</p>
<p className="text-sm text-gray-900">{profile?.email ?? user.email}</p>
</div>
<div>
<p className="text-xs font-medium text-gray-500">Role</p>
<p className="text-sm capitalize text-gray-900">{profile?.role ?? 'member'}</p>
</div>
</div>
 
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
<p className="mb-3 text-sm font-medium text-gray-900">Your jars</p>

            {jars.length === 0 ? (
<p className="text-sm text-gray-500">You're not assigned to any jar yet.</p>

            ) : (
<div className="space-y-2">

                {jars.map((jar) => (
<div

                    key={jar.id}

                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
>
<span className="text-sm text-gray-800">{jar.name}</span>

                    {jar.isDefault && (
<span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">

                        Default
</span>

                    )}
</div>

                ))}
</div>

            )}
</div>
 
          <div className="rounded-xl bg-white p-4 shadow-sm">
<p className="mb-3 text-sm font-medium text-gray-900">Change password</p>
{/* <ChangePasswordForm /> */}
</div>
</div>
</div>
</div>

  )

}

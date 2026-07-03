'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {

  const router = useRouter()

  const [email, setEmail] = useState('')

  const [password, setPassword] = useState('')

  const [error, setError] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {

    e.preventDefault()

    setError(null)

    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {

      setError(error.message)

      return

    }

    router.push('/')

    router.refresh()

  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form

        onSubmit={handleLogin}

        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm"
      >
        <h1 className="text-lg font-medium text-gray-900">Log in to Sanchay</h1>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input

              type="email"

              required

              value={email}

              onChange={(e) => setEmail(e.target.value)}

              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"

              placeholder="you@example.com"

            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input

              type="password"

              required

              value={password}

              onChange={(e) => setPassword(e.target.value)}

              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"

              placeholder="Your password"

            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button

          type="submit"

          disabled={loading}

          className="mt-6 w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >

          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">

          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-blue-600">

            Sign up
          </Link>
        </p>
      </form>
    </div>

  )

}

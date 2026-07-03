'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {

  const router = useRouter()

  const [fullName, setFullName] = useState('')

  const [email, setEmail] = useState('')

  const [password, setPassword] = useState('')

  const [error, setError] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)

  const [submitted, setSubmitted] = useState(false)

  async function handleSignup(e: React.FormEvent) {

    e.preventDefault()

    setError(null)

    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signUp({

      email,

      password,

      options: {

        data: { full_name: fullName },

      },

    })

    setLoading(false)

    if (error) {

      setError(error.message)

      return

    }

    setSubmitted(true)

  }

  if (submitted) {

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-medium text-gray-900">Check your email</h1>
          <p className="mt-2 text-sm text-gray-600">

            We&apos;ve sent a confirmation link to <strong>{email}</strong>. Click it, then come

            back and log in.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-medium text-blue-600">

            Go to login
          </Link>
        </div>
      </div>

    )

  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form

        onSubmit={handleSignup}

        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm"
      >
        <h1 className="text-lg font-medium text-gray-900">Create your Sanchay account</h1>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full name</label>
            <input

              type="text"

              required

              value={fullName}

              onChange={(e) => setFullName(e.target.value)}

              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"

              placeholder="Vanshika Sharma"

            />
          </div>

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

              minLength={6}

              value={password}

              onChange={(e) => setPassword(e.target.value)}

              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"

              placeholder="At least 6 characters"

            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button

          type="submit"

          disabled={loading}

          className="mt-6 w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >

          {loading ? 'Creating account...' : 'Sign up'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">

          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600">

            Log in
          </Link>
        </p>
      </form>
    </div>

  )

}

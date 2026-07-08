'use client'

import { useState, useRef, useEffect } from 'react'

import Link from 'next/link'

import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

export default function Navbar({ isManager = false }: { isManager?: boolean }) {

    const router = useRouter()

    const [menuOpen, setMenuOpen] = useState(false)

    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {

        function handleClickOutside(e: MouseEvent) {

            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {

                setMenuOpen(false)

            }

        }

        document.addEventListener('mousedown', handleClickOutside)

        return () => document.removeEventListener('mousedown', handleClickOutside)

    }, [])

    async function handleLogout() {

        const supabase = createClient()

        await supabase.auth.signOut()

        router.push('/login')

        router.refresh()

    }

    return (
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
                <Link href="/" className="text-sm font-semibold tracking-wide text-gray-900">

                    Sanchay
                </Link>

                {/* Desktop links */}
                <div className="hidden items-center gap-4 md:flex">
                    {isManager && (
                        <Link href="/manager/users" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                            Users
                        </Link>
                    )}
                    {isManager && (
                        <Link href="/manager/reimbursements" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                            Reimbursements
                        </Link>
                    )}
                    {isManager && (
                        <Link href="/manager/jars" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                            Jars
                        </Link>
                    )}
                    {isManager && (
                        <Link href="/manager/categories" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                            Categories
                        </Link>
                    )}
                    <Link href="/profile" className="text-sm font-medium text-gray-500 hover:text-gray-900">

                        Profile
                    </Link>
                    <button

                        onClick={handleLogout}

                        className="text-sm font-medium text-gray-500 hover:text-gray-900"
                    >

                        Log out
                    </button>
                </div>

                {/* Mobile hamburger */}
                <button

                    onClick={() => setMenuOpen(!menuOpen)}

                    className="flex h-8 w-8 items-center justify-center text-gray-600 md:hidden"

                    aria-label="Menu"
                >
                    <div className="flex flex-col gap-1">
                        <span className="block h-0.5 w-5 bg-gray-600" />
                        <span className="block h-0.5 w-5 bg-gray-600" />
                        <span className="block h-0.5 w-5 bg-gray-600" />
                    </div>
                </button>
            </div>

            {/* Mobile dropdown menu */}

            {menuOpen && (
                <div ref={menuRef} className="mt-3 flex flex-col gap-1 border-t border-gray-100 pt-3 md:hidden">
                    {isManager && (
                        <Link
                            href="/manager/users"
                            onClick={() => setMenuOpen(false)}
                            className="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Users
                        </Link>
                    )}
                    {isManager && (
                        <Link
                            href="/manager/reimbursements"
                            onClick={() => setMenuOpen(false)}
                            className="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Reimbursements
                        </Link>
                    )}
                    {isManager && (
                        <Link
                            href="/manager/jars"
                            onClick={() => setMenuOpen(false)}
                            className="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Jars
                        </Link>
                    )}
                    {isManager && (
                        <Link
                            href="/manager/categories"
                            onClick={() => setMenuOpen(false)}
                            className="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Categories
                        </Link>
                    )}
                    <Link

                        href="/profile"

                        onClick={() => setMenuOpen(false)}

                        className="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >

                        Profile
                    </Link>
                    <button

                        onClick={handleLogout}

                        className="rounded-lg px-2 py-2 text-left text-sm font-medium text-red-600 hover:bg-gray-50"
                    >

                        Log out
                    </button>
                </div>

            )}
        </div>

    )

}
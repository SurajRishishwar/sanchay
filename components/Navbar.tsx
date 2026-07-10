'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Navbar({ isManager = false }: { isManager?: boolean }) {
    const router = useRouter()
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            // Because menuRef now tracks the outer wrapper container, 
            // clicks on the hamburger button won't mistakenly trigger this.
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
        /* FIXED: Moved ref={menuRef} here to wrap BOTH the button and the dropdown */
        <div ref={menuRef} className="sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 transition-colors duration-200">
            <div className="flex items-center justify-between">
                <Link href="/" className="text-sm font-semibold tracking-wide text-gray-900 dark:text-zinc-50">
                    Sanchay
                </Link>

                {/* Desktop links */}
                <div className="hidden items-center gap-4 md:flex">
                    {isManager && (
                        <Link href="/manager/users" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                            Users
                        </Link>
                    )}
                    {isManager && (
                        <Link href="/manager/reimbursements" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                            Reimbursements
                        </Link>
                    )}
                    {isManager && (
                        <Link href="/manager/jars" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                            Jars
                        </Link>
                    )}
                    {isManager && (
                        <Link href="/manager/categories" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                            Categories
                        </Link>
                    )}
                    
                    {/* HIDE FOR MANAGERS (Desktop) */}
                    {!isManager && (
                        <Link href="/history" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                            Months
                        </Link>
                    )}

                    <Link href="/profile" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                        Profile
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer"
                    >
                        Log out
                    </button>

                    {/* Theme Toggle Button for Desktop */}
                    <div className="ml-2 border-l border-gray-200 dark:border-zinc-800 pl-4">
                        <ThemeToggle />
                    </div>
                </div>

                {/* Mobile Hamburger Layout */}
                <div className="flex items-center gap-2 md:hidden">
                    <button
                        onClick={() => setMenuOpen((prev) => !prev)}
                        className="flex h-8 w-8 items-center justify-center text-gray-600 dark:text-zinc-400"
                        aria-label="Menu"
                    >
                        <div className="flex flex-col gap-1">
                            <span className="block h-0.5 w-5 bg-gray-600 dark:bg-zinc-400" />
                            <span className="block h-0.5 w-5 bg-gray-600 dark:bg-zinc-400" />
                            <span className="block h-0.5 w-5 bg-gray-600 dark:bg-zinc-400" />
                        </div>
                    </button>
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {menuOpen && (
                /* REMOVED ref={menuRef} from here */
                <div className="mt-3 flex flex-col gap-1 border-t border-gray-100 dark:border-zinc-800 pt-3 md:hidden">
                    {isManager && (
                        <Link
                            href="/manager/users"
                            onClick={() => setMenuOpen(false)}
                            className="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                            Users
                        </Link>
                    )}
                    {isManager && (
                        <Link
                            href="/manager/reimbursements"
                            onClick={() => setMenuOpen(false)}
                            className="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                            Reimbursements
                        </Link>
                    )}
                    {isManager && (
                        <Link
                            href="/manager/jars"
                            onClick={() => setMenuOpen(false)}
                            className="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                            Jars
                        </Link>
                    )}
                    {isManager && (
                        <Link
                            href="/manager/categories"
                            onClick={() => setMenuOpen(false)}
                            className="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                            Categories
                        </Link>
                    )}

                    {/* HIDE FOR MANAGERS (Mobile) */}
                    {!isManager && (
                        <Link
                            href="/history"
                            onClick={() => setMenuOpen(false)}
                            className="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                            Months
                        </Link>
                    )}

                    <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                        Profile
                    </Link>

                    {/* Theme Toggle option row for Mobile */}
                    <div className="flex items-center justify-between rounded-lg px-2 py-1 text-sm font-medium text-gray-700 dark:text-zinc-300">
                        <span>Theme Mode</span>
                        <ThemeToggle />
                    </div>

                    <button
                        onClick={handleLogout}
                        className="rounded-lg px-2 py-2 text-left text-sm font-medium text-red-600 hover:bg-gray-50 dark:text-red-400 dark:hover:bg-zinc-900 cursor-pointer"
                    >
                        Log out
                    </button>
                </div>
            )}
        </div>
    )
}
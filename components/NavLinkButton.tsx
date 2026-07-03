'use client'

import { useTransition } from 'react'

import { useRouter } from 'next/navigation'

export default function NavLinkButton({

    href,

    className,

    children,

}: {

    href: string

    className?: string

    children: React.ReactNode

}) {

    const router = useRouter()

    const [isPending, startTransition] = useTransition()

    return (
        <button

            onClick={() => startTransition(() => router.push(href))}

            disabled={isPending}

            className={`${className ?? ''} ${isPending ? 'opacity-50' : ''}`}
        >

            {isPending ? (
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />

                    {children}
                </span>

            ) : (

                children

            )}
        </button>

    )

}

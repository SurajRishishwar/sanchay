'use client'

import { createContext, useContext, useState, useCallback } from 'react'

type ToastItem = { id: number; message: string; type: 'success' | 'error' }

type ToastContextType = { showToast: (message: string, type?: 'success' | 'error') => void }

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {

    const ctx = useContext(ToastContext)

    if (!ctx) throw new Error('useToast must be used within a ToastProvider')

    return ctx

}

export function ToastProvider({ children }: { children: React.ReactNode }) {

    const [toasts, setToasts] = useState<ToastItem[]>([])

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {

        const id = Date.now()

        setToasts((prev) => [...prev, { id, message, type }])

        setTimeout(() => {

            setToasts((prev) => prev.filter((t) => t.id !== id))

        }, 2500)

    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>

            {children}
            <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">

                {toasts.map((t) => (
                    <div

                        key={t.id}

                        className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${t.type === 'success' ? 'bg-gray-900' : 'bg-red-600'

                            }`}
                    >

                        {t.message}
                    </div>

                ))}
            </div>
        </ToastContext.Provider>

    )

}

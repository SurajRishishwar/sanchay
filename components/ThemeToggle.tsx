'use client'

import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  // Sync state with HTML element class on mount
  useEffect(() => {
    const isDarkClassPresent = document.documentElement.classList.contains('dark')
    setIsDark(isDarkClassPresent)
  }, [])

  const toggleTheme = () => {
    const nextMode = !isDark
    setIsDark(nextMode)

    if (nextMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <button 
      onClick={toggleTheme} 
      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-900 cursor-pointer text-gray-700 dark:text-zinc-300"
    >
      {isDark ? '☀️ Light' : '🌙 Dark'}
    </button>
  )
}
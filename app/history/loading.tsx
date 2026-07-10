export default function Loading() {
  return (
    /* Added dark:bg-zinc-950 and transition effects */
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
      {/* Added dark:border-zinc-800 dark:border-t-zinc-400 to match your theme spinner rules */}
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600 dark:border-zinc-800 dark:border-t-zinc-400" />
    </div>
  )
}
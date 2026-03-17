import React from 'react'

/**
 * Loader shown on home page while sections are loading.
 * Centered spinner + label.
 */
function HomePageLoader() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[40vh] w-full py-12"
      role="status"
      aria-label="Loading home page"
    >
      <div className="relative w-12 h-12">
        <div
          className="absolute inset-0 rounded-full border-2 border-gray-200"
          aria-hidden
        />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-black animate-spin"
          aria-hidden
          style={{ animationDuration: '0.8s' }}
        />
      </div>
      <p className="mt-4 font-inter text-sm text-gray-500">Loading…</p>
    </div>
  )
}

export default HomePageLoader

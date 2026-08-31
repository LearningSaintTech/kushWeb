import React from 'react'

/**
 * Shimmer / Skeleton card matching PostCard geometry
 */
export function PostCardSkeleton() {
  return (
    <article className="border-b border-neutral-100 pb-8 last:border-0 animate-pulse">
      {/* Header: Avatar, Name, Role, Follow button placeholder */}
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-200" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3.5 w-28 rounded-md bg-neutral-200" />
          <div className="h-2.5 w-16 rounded-md bg-neutral-200/80" />
        </div>
        <div className="h-4 w-12 rounded-md bg-neutral-200/80" />
      </header>

      {/* Main image placeholder (aspect 4/5) */}
      <div className="relative mt-4 overflow-hidden rounded-xl bg-neutral-200 aspect-[4/5] w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </div>

      {/* Action buttons (Like, Comment, Share, Save) */}
      <div className="mt-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-6 w-14 rounded-md bg-neutral-200" />
          <div className="h-6 w-14 rounded-md bg-neutral-200" />
          <div className="h-6 w-8 rounded-md bg-neutral-200" />
        </div>
        <div className="h-6 w-6 rounded-md bg-neutral-200" />
      </div>

      {/* Likes count / Date line */}
      <div className="mt-3 space-y-2">
        <div className="h-3.5 w-3/4 rounded-md bg-neutral-200" />
        <div className="h-3.5 w-1/2 rounded-md bg-neutral-200/70" />
      </div>

      {/* Hashtag chips */}
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-neutral-200/80" />
        <div className="h-5 w-20 rounded-full bg-neutral-200/80" />
      </div>
    </article>
  )
}

/**
 * Grid item skeleton for Saved feed / Search grid
 */
export function GridCardSkeleton() {
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-neutral-200 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
    </div>
  )
}

/**
 * Search masonry card skeleton
 */
export function SearchCardSkeleton() {
  return (
    <div className="mb-4 block w-full break-inside-avoid animate-pulse">
      <div className="overflow-hidden rounded-2xl bg-neutral-200 aspect-[3/4] w-full relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </div>
      <div className="mt-2.5 flex items-center gap-2 px-0.5">
        <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-200" />
        <div className="h-3 w-20 rounded-md bg-neutral-200 flex-1" />
        <div className="h-3 w-8 rounded-md bg-neutral-200" />
      </div>
    </div>
  )
}

export default PostCardSkeleton

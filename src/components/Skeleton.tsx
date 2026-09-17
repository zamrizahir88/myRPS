/** Placeholders that hold the layout, so pages do not jump as data lands. */
export function SkeletonLine({ w = '100%', h = 14 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h }} />
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 999 }} />
        <div className="flex-1 space-y-2">
          <SkeletonLine w="40%" h={12} />
          <SkeletonLine w="25%" h={10} />
        </div>
      </div>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} w={i === lines - 1 ? '70%' : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} lines={lines} />)}
    </div>
  )
}

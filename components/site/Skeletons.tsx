export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-3xl border border-navy-100 bg-white">
          <div className="skeleton h-52 w-full" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-5 w-3/4 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-6 w-28 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="skeleton mb-4 h-4 w-40 rounded" />
      <div className="skeleton aspect-[16/10] w-full rounded-3xl sm:aspect-[21/9]" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <div className="skeleton h-4 w-48 rounded" />
          <div className="skeleton h-9 w-2/3 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
          <div className="skeleton mt-6 h-40 w-full rounded-2xl" />
        </div>
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function ListingSkeleton({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold text-navy-900">{title}</h1>
        <div className="skeleton mt-3 h-4 w-2/3 rounded" />
      </div>
      <CardGridSkeleton />
    </div>
  );
}

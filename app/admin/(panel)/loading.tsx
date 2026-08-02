export default function Loading() {
  return (
    <div>
      <div className="skeleton mb-6 h-8 w-48 rounded" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-navy-100 bg-white p-5">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton mt-3 h-8 w-20 rounded" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-navy-100 bg-white p-5">
        <div className="skeleton h-5 w-40 rounded" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

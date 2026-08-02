"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4 text-center">
      <p className="font-display text-5xl font-bold text-navy-900">Oops</p>
      <h1 className="mt-2 text-xl font-semibold text-navy-800">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-navy-500">An unexpected error occurred. Please try again.</p>
      <button onClick={reset} className="mt-6 rounded-full bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
        Try again
      </button>
    </div>
  );
}

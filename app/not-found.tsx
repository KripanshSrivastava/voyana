import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4 text-center">
      <p className="font-display text-6xl font-bold text-navy-900">404</p>
      <h1 className="mt-2 text-xl font-semibold text-navy-800">Page not found</h1>
      <p className="mt-2 max-w-sm text-navy-500">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <Link href="/" className="mt-6 rounded-full bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
        Back to home
      </Link>
    </div>
  );
}

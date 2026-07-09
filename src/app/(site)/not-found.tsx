import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Page not found</p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white hover:opacity-90 transition-colors"
      >
        Back to Home
      </Link>
    </section>
  );
}

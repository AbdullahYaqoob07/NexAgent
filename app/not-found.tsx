import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-white mb-4">404</h1>
        <p className="text-white/70 text-lg mb-8">This page could not be found.</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

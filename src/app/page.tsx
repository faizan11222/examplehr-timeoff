import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-gray-900">ExampleHR Time-Off Portal</h1>
      <p className="mt-3 text-gray-500">
        Manage leave balances and requests against the HCM source of truth.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/employee"
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Employee View
        </Link>
        <Link
          href="/manager"
          className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Manager View
        </Link>
      </div>
    </div>
  );
}

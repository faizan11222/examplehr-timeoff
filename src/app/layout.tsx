import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { Providers } from '@/components/Providers';

const geist = Geist({ variable: '--font-geist', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ExampleHR — Time Off',
  description: 'Employee leave management for ExampleHR',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-gray-50 font-sans">
        <nav className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-sm font-bold text-blue-600 hover:text-blue-800">
              ExampleHR
            </Link>
            <Link
              href="/employee"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              My Time Off
            </Link>
            <Link
              href="/manager"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Approvals
            </Link>
          </div>
        </nav>
        <Providers>
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

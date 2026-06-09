import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GudLift PR — Gym Leaderboard',
  description: 'Powerlifting personal records leaderboard ranked by GL points',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 bg-zinc-900">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-2xl font-bold tracking-tight text-white">GudLift PR</span>
              <span className="text-xs text-zinc-500 hidden sm:block">PR Leaderboard</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/submit"
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Submit a Lift
              </Link>
              <Link href="/admin" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">{children}</main>
        <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
          Data taken from https://www.openpowerlifting.org/
        </footer>
      </body>
    </html>
  )
}

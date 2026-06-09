'use client'

import { useState } from 'react'
import { extractOplUsername } from '@/lib/extract-opl-username'

export default function SubmitPage() {
  const [input, setInput]   = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError]   = useState('')

  const parsed = extractOplUsername(input)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError('')

    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opl_username: parsed }),
    })

    if (res.ok) {
      setStatus('success')
      setInput('')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold mb-2">Submission received!</h2>
        <p className="text-zinc-400 mb-8">
          Your OpenPowerlifting profile has been submitted for review. Once approved it will appear on the leaderboard.
        </p>
        <button onClick={() => setStatus('idle')} className="text-sm text-red-400 hover:text-red-300 underline">
          Submit another
        </button>
      </div>
    )
  }

  const isUrl = input.trim().includes('openpowerlifting.org')

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-1">Submit Your Profile</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Paste your OpenPowerlifting profile link or just your username.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            OpenPowerlifting Profile <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            required
            placeholder="e.g. jackkay or https://www.openpowerlifting.org/u/jackkay"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600"
          />
          {/* Live preview when a URL is pasted */}
          {parsed && isUrl && (
            <p className="mt-2 text-xs text-green-400">
              Username detected: <span className="font-mono font-semibold">{parsed}</span>
            </p>
          )}
          {!isUrl && (
            <p className="mt-2 text-xs text-zinc-500">
              Find yours at <span className="text-zinc-400 font-mono">openpowerlifting.org/u/YOUR-USERNAME</span>
            </p>
          )}
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-400 bg-red-950/40 px-4 py-3 rounded-lg border border-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'sending' || !parsed}
          className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {status === 'sending' ? 'Checking...' : 'Submit for Review'}
        </button>

        <p className="text-xs text-zinc-600 text-center">
          Submissions are reviewed before appearing on the leaderboard.
        </p>
      </form>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { OPLMeet, PersonalBests } from '@/lib/opl'

function fmt(val: number | null, d = 2) { return val != null ? val.toFixed(d) : '—' }
function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function LifterPage() {
  const { username } = useParams<{ username: string }>()
  const [meets, setMeets]         = useState<OPLMeet[]>([])
  const [lifterName, setLifterName] = useState('')
  const [pbs, setPbs]             = useState<Record<string, PersonalBests>>({})
  const [state, setState]         = useState<'loading' | 'loaded' | 'error'>('loading')
  const [error, setError]         = useState('')

  useEffect(() => {
    fetch(`/api/lifter/${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setState('error'); return }

        // Compute personal bests per equipment
        const pbs: Record<string, PersonalBests> = {}
        for (const m of data.meets as OPLMeet[]) {
          if (!pbs[m.equipment]) pbs[m.equipment] = { squat: null, bench: null, deadlift: null, total: null, gl: null }
          const pb = pbs[m.equipment]
          if (m.squat_kg    && m.squat_kg    > (pb.squat    ?? 0)) pb.squat    = m.squat_kg
          if (m.bench_kg    && m.bench_kg    > (pb.bench    ?? 0)) pb.bench    = m.bench_kg
          if (m.deadlift_kg && m.deadlift_kg > (pb.deadlift ?? 0)) pb.deadlift = m.deadlift_kg
          if (m.total_kg    && m.total_kg    > (pb.total    ?? 0)) pb.total    = m.total_kg
          if (m.gl_points   && m.gl_points   > (pb.gl       ?? 0)) pb.gl       = m.gl_points
        }

        setMeets(data.meets)
        setLifterName(data.lifterName)
        setPbs(pbs)
        setState('loaded')
      })
      .catch(() => { setError('Failed to load lifter data.'); setState('error') })
  }, [username])

  if (state === 'loading') {
    return <p className="text-zinc-400 py-20 text-center">Loading...</p>
  }

  if (state === 'error') {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 text-sm underline">Back to leaderboard</Link>
      </div>
    )
  }

  const equipOrder = ['Raw', 'Wraps', 'Single-ply', 'Multi-ply']
  const sortedEquip = Object.keys(pbs).sort((a, b) => {
    const ai = equipOrder.indexOf(a)
    const bi = equipOrder.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 block">← Leaderboard</Link>
          <h1 className="text-3xl font-bold">{lifterName}</h1>
          <a
            href={`https://www.openpowerlifting.org/u/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-300 font-mono mt-1 block"
          >
            openpowerlifting.org/u/{username} ↗
          </a>
        </div>
      </div>

      {/* Personal Bests */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Personal Bests</h2>
        <div className="space-y-3">
          {sortedEquip.map(equip => {
            const pb = pbs[equip]
            return (
              <div key={equip} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-zinc-800/60 border-b border-zinc-700">
                  <span className="text-sm font-medium text-zinc-300">{equip}</span>
                </div>
                <div className="grid grid-cols-5 divide-x divide-zinc-800">
                  {[
                    { label: 'Squat',    value: pb.squat },
                    { label: 'Bench',    value: pb.bench },
                    { label: 'Deadlift', value: pb.deadlift },
                    { label: 'Total',    value: pb.total },
                    { label: 'GL Pts',   value: pb.gl, d: 4, highlight: true },
                  ].map(({ label, value, d = 2, highlight }) => (
                    <div key={label} className="px-4 py-3 text-center">
                      <p className="text-xs text-zinc-500 mb-1">{label}</p>
                      <p className={`font-bold text-lg ${highlight ? 'text-amber-400' : 'text-zinc-100'}`}>
                        {fmt(value, d)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Competition history */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Competition History</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                {['Date', 'Competition', 'Fed', 'Equip', 'Div', 'Class', 'BW', 'Squat', 'Bench', 'Dead', 'Total', 'GL Pts'].map(h => (
                  <th key={h} className="px-3 py-3 text-xs font-semibold text-zinc-400 text-right first:text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meets.map((m, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/60 transition-colors">
                  <td className="px-3 py-2.5 text-left text-zinc-300 whitespace-nowrap">{fmtDate(m.date)}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-200 max-w-[200px] truncate">{m.meet_name}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-400">{m.federation}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${m.equipment === 'Raw' ? 'bg-zinc-700 text-zinc-300' : 'bg-blue-900/50 text-blue-300'}`}>
                      {m.equipment}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-zinc-400 text-xs">{m.division}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-300">{m.weight_class}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(m.bodyweight_kg)}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(m.squat_kg)}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(m.bench_kg)}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(m.deadlift_kg)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-zinc-100">{fmt(m.total_kg)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-amber-400 font-mono">{fmt(m.gl_points, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-600">{meets.length} competition{meets.length !== 1 ? 's' : ''}</p>
      </section>
    </div>
  )
}

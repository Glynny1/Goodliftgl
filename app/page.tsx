'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import type { Submission, Sex } from '@/lib/weight-classes'

type Tab = 'all' | 'M' | 'F'

const COLUMNS = [
  { key: 'rank',         label: '#',       className: 'w-10 text-right' },
  { key: 'name',         label: 'Name',    className: 'text-left' },
  { key: 'age',          label: 'Age',     className: 'w-14 text-right' },
  { key: 'weight_class', label: 'Class',   className: 'w-16 text-right' },
  { key: 'equipment',    label: 'Equip',   className: 'w-20 text-right' },
  { key: 'bodyweight',   label: 'BW (kg)', className: 'w-20 text-right' },
  { key: 'squat',        label: 'Squat',   className: 'w-20 text-right' },
  { key: 'bench',        label: 'Bench',   className: 'w-20 text-right' },
  { key: 'deadlift',     label: 'Deadlift',    className: 'w-20 text-right' },
  { key: 'total',        label: 'Total',   className: 'w-20 text-right' },
  { key: 'gl_points',    label: 'GL Points', className: 'w-24 text-right font-semibold' },
  { key: 'date',         label: 'Date',    className: 'w-28 text-right' },
]

function fmt(val: number | null, decimals = 2) {
  return val !== null ? val.toFixed(decimals) : '—'
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function HomePage() {
  const [sexTab, setSexTab] = useState<Tab>('all')
  const [rows, setRows]     = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('submissions')
      .select('*')
      .eq('status', 'approved')

    if (sexTab !== 'all') query = query.eq('sex', sexTab)

    const { data } = await query.order('gl_points', { ascending: false, nullsFirst: false })
    setRows(data ?? [])
    setLoading(false)
  }, [sexTab])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Rankings</h1>
        <p className="text-zinc-400 text-sm">Ordered by IPF GL points &mdash; all weights in kg</p>
        <p className="text-zinc-500 text-sm mt-1">Below are the top performers by GL points. Click your name to view details.</p>
      </div>

      {/* Sex tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900 rounded-lg p-1 w-fit">
        {(['all', 'M', 'F'] as Tab[]).map(s => (
          <button
            key={s}
            onClick={() => setSexTab(s)}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              sexTab === s ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {s === 'all' ? 'Overall' : s === 'M' ? 'Men' : 'Women'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 border-b border-zinc-800">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 ${col.className}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-zinc-500">
                  No approved entries yet.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-900/60 ${
                    i === 0 ? 'bg-yellow-950/20' : i === 1 ? 'bg-zinc-800/10' : ''
                  }`}
                >
                  <td className="px-3 py-3 text-right text-zinc-400 font-mono">{i + 1}</td>
                  <td className="px-3 py-3 font-medium">
                    <Link href={`/u/${row.opl_username}`} className="hover:text-red-400 transition-colors">
                      {`${row.first_name ?? ''} ${row.last_name ?? ''}`.replace(/\s*#\d+$/, '').trim()}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right text-zinc-300">{row.age}</td>
                  <td className="px-3 py-3 text-right text-zinc-300">{row.weight_class}</td>
                  <td className="px-3 py-3 text-right text-zinc-300">{row.equipment ?? '—'}</td>
                  <td className="px-3 py-3 text-right text-zinc-300">{fmt(row.bodyweight_kg)}</td>
                  <td className="px-3 py-3 text-right text-zinc-300">{fmt(row.squat_kg)}</td>
                  <td className="px-3 py-3 text-right text-zinc-300">{fmt(row.bench_kg)}</td>
                  <td className="px-3 py-3 text-right text-zinc-300">{fmt(row.deadlift_kg)}</td>
                  <td className="px-3 py-3 text-right font-medium text-zinc-100">{fmt(row.total_kg)}</td>
                  <td className="px-3 py-3 text-right font-bold text-amber-400 font-mono">{fmt(row.gl_points ?? null, 4)}</td>
                  <td className="px-3 py-3 text-right text-zinc-500 text-xs">{row.date ? fmtDate(row.date) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        {rows.length} {rows.length === 1 ? 'entry' : 'entries'} shown
      </p>
    </div>
  )
}

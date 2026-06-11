'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import type { Submission, Sex } from '@/lib/weight-classes'
import type { HistoryPoint } from '@/app/api/stats/gl-history/route'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

type Tab = 'all' | 'M' | 'F'
type EquipTab = 'all' | 'Raw' | 'Wraps' | 'Single-ply' | 'Multi-ply'

const EQUIP_TABS: EquipTab[] = ['all', 'Raw', 'Wraps', 'Single-ply', 'Multi-ply']

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

interface YearPoint {
  year: string
  men: number | null
  women: number | null
}

function buildChartData(meets: HistoryPoint[]): YearPoint[] {
  const byYear: Record<string, { men: number[]; women: number[] }> = {}
  for (const m of meets) {
    const year = m.date.slice(0, 4)
    if (!byYear[year]) byYear[year] = { men: [], women: [] }
    if (m.sex === 'M') byYear[year].men.push(m.gl_points)
    else byYear[year].women.push(m.gl_points)
  }
  return Object.entries(byYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, { men, women }]) => ({
      year,
      men:   men.length   ? Math.round((men.reduce((a, b) => a + b, 0)   / men.length)   * 100) / 100 : null,
      women: women.length ? Math.round((women.reduce((a, b) => a + b, 0) / women.length) * 100) / 100 : null,
    }))
}

export default function HomePage() {
  const [sexTab, setSexTab]           = useState<Tab>('all')
  const [equipTab, setEquipTab]       = useState<EquipTab>('all')
  const [weightClassTab, setWeightClassTab]         = useState<string>('all')
  const [availableWeightClasses, setAvailableWeightClasses] = useState<string[]>([])
  const [rows, setRows]         = useState<Submission[]>([])
  const [loading, setLoading]   = useState(true)
  const [historyMeets, setHistoryMeets] = useState<HistoryPoint[]>([])
  const [chartOpen, setChartOpen]       = useState(false)

  const supabase = createClient()

  // Reset weight class when sex tab changes (classes differ by sex)
  useEffect(() => { setWeightClassTab('all') }, [sexTab])

  useEffect(() => {
    fetch('/api/stats/gl-history')
      .then(r => r.json())
      .then(({ meets }) => setHistoryMeets(meets ?? []))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('submissions')
      .select('*')
      .eq('status', 'approved')

    if (sexTab !== 'all') query = query.eq('sex', sexTab)

    const { data } = await query.order('gl_points', { ascending: false, nullsFirst: false })
    let all = data ?? []

    // Derive available weight classes from the sex-filtered data (before other filters)
    if (sexTab !== 'all') {
      const classes = [...new Set(all.map(r => r.weight_class).filter(Boolean) as string[])]
        .sort((a, b) => {
          const n = parseFloat(a) - parseFloat(b)
          if (n !== 0) return n
          return a.includes('+') ? 1 : -1
        })
      setAvailableWeightClasses(classes)
    }

    // Filter by equipment if a specific tab is selected
    if (equipTab !== 'all') all = all.filter(r => r.equipment === equipTab)

    // Filter by weight class if selected
    if (weightClassTab !== 'all') all = all.filter(r => r.weight_class === weightClassTab)

    // Deduplicate by opl_username: keep the highest GL row per lifter
    const seen = new Map<string, Submission>()
    for (const row of all) {
      const existing = seen.get(row.opl_username)
      if (!existing || (row.gl_points ?? 0) > (existing.gl_points ?? 0)) {
        seen.set(row.opl_username, row)
      }
    }

    setRows([...seen.values()].sort((a, b) => (b.gl_points ?? 0) - (a.gl_points ?? 0)))
    setLoading(false)
  }, [sexTab, equipTab, weightClassTab])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Rankings</h1>
        <p className="text-zinc-400 text-sm">Ordered by IPF GL points &mdash; all weights in kg</p>
        <p className="text-zinc-500 text-sm mt-1">Below are the top performers by GL points. Click your name to view details.</p>
      </div>

      {/* Sex tabs */}
      <div className="flex gap-1 mb-3 bg-zinc-900 rounded-lg p-1 w-fit">
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

      {/* Equipment tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900/50 rounded-lg p-1 w-fit">
        {EQUIP_TABS.map(e => (
          <button
            key={e}
            onClick={() => setEquipTab(e)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              equipTab === e ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {e === 'all' ? 'All Equipment' : e}
          </button>
        ))}
      </div>

      {/* Weight class filter — only shown when a sex is selected */}
      {sexTab !== 'all' && (
        <div className="flex gap-1 mb-6 flex-wrap">
          {['all', ...availableWeightClasses].map(wc => (
            <button
              key={wc}
              onClick={() => setWeightClassTab(wc)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                weightClassTab === wc ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {wc === 'all' ? 'All classes' : `${wc} kg`}
            </button>
          ))}
        </div>
      )}

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

      {/* GL Progression Chart — collapsible */}
      <div className="mt-10 border border-zinc-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setChartOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 bg-zinc-900 hover:bg-zinc-800/60 transition-colors text-left"
        >
          <div>
            <span className="font-semibold text-sm">Gym GL Progression</span>
            <span className="ml-3 text-xs text-zinc-500">Average GL by year across all members</span>
          </div>
          <span className="text-zinc-400 text-lg leading-none">{chartOpen ? '▲' : '▼'}</span>
        </button>
        {chartOpen && (() => {
          const chartData = buildChartData(historyMeets)
          return (
            <div className="bg-zinc-900/40 px-6 py-6 border-t border-zinc-800">
              {historyMeets.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Loading history from OpenPowerlifting...</p>
              ) : chartData.length < 2 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Not enough data across multiple years yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="year" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={{ stroke: '#3f3f46' }} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                      labelStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                      itemStyle={{ color: '#a1a1aa' }}
                      formatter={(val) => [typeof val === 'number' ? `${val.toFixed(2)} GL` : val, undefined]}
                    />
                    <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
                    <Line type="monotone" dataKey="men"   name="Men"   stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} connectNulls activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="women" name="Women" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4, fill: '#f43f5e' }} connectNulls activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { WEIGHT_CLASSES } from '@/lib/weight-classes'
import type { Submission, Sex } from '@/lib/weight-classes'
import type { User } from '@supabase/supabase-js'
import type { OPLMeet } from '@/app/api/admin/opl-lookup/route'

type AdminStatus = 'loading' | 'unauthenticated' | 'unauthorized' | 'authorized'
type AdminTab    = 'pending' | 'approved'

interface EditValues {
  first_name: string; last_name: string; date: string; sex: Sex
  age: string; weight_class: string; bodyweight_kg: string
  squat_kg: string; bench_kg: string; deadlift_kg: string
}

function toEditValues(s: Submission): EditValues {
  return {
    first_name: s.first_name ?? '', last_name: s.last_name ?? '', date: s.date ?? '',
    sex: s.sex ?? 'M', age: String(s.age ?? ''), weight_class: s.weight_class ?? '',
    bodyweight_kg: String(s.bodyweight_kg ?? ''),
    squat_kg: s.squat_kg != null ? String(s.squat_kg) : '',
    bench_kg: s.bench_kg != null ? String(s.bench_kg) : '',
    deadlift_kg: s.deadlift_kg != null ? String(s.deadlift_kg) : '',
  }
}

function fmt(val: number | null, d = 2) { return val != null ? val.toFixed(d) : '—' }
function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── OPL Review Modal ───────────────────────────────────────────────────────

function OPLReviewModal({
  sub, onApprove, onReject, onClose,
}: {
  sub: Submission
  onApprove: (id: string, meet: OPLMeet) => Promise<void>
  onReject:  (id: string) => Promise<void>
  onClose:   () => void
}) {
  const [meets, setMeets]           = useState<OPLMeet[]>([])
  const [lifterName, setLifterName] = useState('')
  const [bestMeet, setBestMeet]     = useState<OPLMeet | null>(null)
  const [loadState, setLoadState]   = useState<'loading' | 'loaded' | 'error'>('loading')
  const [loadError, setLoadError]   = useState('')
  const [acting, setActing]         = useState(false)

  useEffect(() => {
    fetch(`/api/admin/opl-lookup?username=${encodeURIComponent(sub.opl_username)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setLoadError(data.error); setLoadState('error') }
        else { setMeets(data.meets); setLifterName(data.lifterName); setBestMeet(data.bestMeet); setLoadState('loaded') }
      })
      .catch(() => { setLoadError('Network error.'); setLoadState('error') })
  }, [sub.opl_username])

  async function handleApprove() {
    if (!bestMeet) return
    setActing(true)
    await onApprove(sub.id, bestMeet)
  }

  async function handleReject() {
    setActing(true)
    await onReject(sub.id)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold">
              Review: <span className="font-mono text-zinc-300">{sub.opl_username}</span>
            </h2>
            {lifterName && <p className="text-sm text-zinc-400 mt-0.5">{lifterName}</p>}
            <a
              href={`https://www.openpowerlifting.org/u/${sub.opl_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 underline mt-1 inline-block"
            >
              View on OpenPowerlifting ↗
            </a>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {loadState === 'loading' && (
            <p className="text-zinc-400 text-center py-12">Fetching from OpenPowerlifting...</p>
          )}
          {loadState === 'error' && (
            <p className="text-red-400 text-center py-12">{loadError}</p>
          )}
          {loadState === 'loaded' && meets.length === 0 && (
            <p className="text-zinc-400 text-center py-12">No completed meets found for this lifter.</p>
          )}
          {loadState === 'loaded' && meets.length > 0 && (
            <>
              {bestMeet && (
                <div className="mb-4 bg-green-950/30 border border-green-800 rounded-xl px-4 py-3 text-sm">
                  <span className="text-green-400 font-medium">Best GL score: </span>
                  <span className="text-zinc-200">{bestMeet.meet_name} ({fmtDate(bestMeet.date)}) — </span>
                  <span className="text-amber-400 font-bold font-mono">{fmt(bestMeet.gl_points, 4)} GL</span>
                  <span className="text-zinc-400"> · Total {fmt(bestMeet.total_kg)} kg · BW {fmt(bestMeet.bodyweight_kg)} kg</span>
                </div>
              )}
              <p className="text-xs text-zinc-500 mb-3">Full competition history for reference:</p>
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-800 border-b border-zinc-700">
                      {['Date', 'Meet', 'Fed', 'Equip', 'Class', 'BW', 'Squat', 'Bench', 'Dead', 'Total', 'GL Pts'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-xs font-semibold text-zinc-400 text-right first:text-left whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {meets.map((m, i) => {
                      const isBest = m === bestMeet
                      return (
                        <tr
                          key={i}
                          className={`border-b border-zinc-800/50 transition-colors ${
                            isBest ? 'bg-green-900/20' : 'hover:bg-zinc-800/40'
                          }`}
                        >
                          <td className="px-3 py-2.5 text-left text-zinc-300 whitespace-nowrap">{fmtDate(m.date)}</td>
                          <td className="px-3 py-2.5 text-right text-zinc-300 max-w-[160px] truncate">{m.meet_name}</td>
                          <td className="px-3 py-2.5 text-right text-zinc-400">{m.federation}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${m.equipment === 'Raw' ? 'bg-zinc-700 text-zinc-300' : 'bg-blue-900/50 text-blue-300'}`}>
                              {m.equipment}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-zinc-300">{m.weight_class}</td>
                          <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(m.bodyweight_kg)}</td>
                          <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(m.squat_kg)}</td>
                          <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(m.bench_kg)}</td>
                          <td className="px-3 py-2.5 text-right text-zinc-300">{fmt(m.deadlift_kg)}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-zinc-100">{fmt(m.total_kg)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-amber-400 font-mono">{fmt(m.gl_points, 4)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-zinc-800 shrink-0">
          <button
            onClick={handleReject}
            disabled={acting}
            className="bg-zinc-700 hover:bg-red-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Reject
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 px-4 py-2.5 text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={!bestMeet || acting}
            className="bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {acting ? 'Saving...' : 'Approve Best GL'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ─────────────────────────────────────────────────────────────

function EditModal({ sub, onSave, onClose }: { sub: Submission; onSave: (s: Submission) => void; onClose: () => void }) {
  const [values, setValues] = useState<EditValues>(toEditValues(sub))
  const [saving, setSaving]   = useState(false)
  const [repolling, setRepolling] = useState(false)
  const [error, setError]     = useState('')
  const [repollMsg, setRepollMsg] = useState('')

  const set = (k: keyof EditValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues(prev => ({ ...prev, [k]: e.target.value }))

  async function save() {
    setSaving(true); setError('')
    const res = await fetch('/api/admin/edit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sub.id, ...values,
        age: Number(values.age),
        bodyweight_kg: Number(values.bodyweight_kg),
        squat_kg: values.squat_kg !== '' ? Number(values.squat_kg) : null,
        bench_kg: values.bench_kg !== '' ? Number(values.bench_kg) : null,
        deadlift_kg: values.deadlift_kg !== '' ? Number(values.deadlift_kg) : null,
      }),
    })
    if (res.ok) { onSave(await res.json()) }
    else { const d = await res.json(); setError(d.error ?? 'Failed to save.'); setSaving(false) }
  }

  async function repoll() {
    setRepolling(true); setError(''); setRepollMsg('')
    const res = await fetch(`/api/admin/opl-lookup?username=${encodeURIComponent(sub.opl_username)}`)
    const data = await res.json()
    if (!res.ok || data.error) {
      setError(data.error ?? 'Failed to fetch from OpenPowerlifting.')
      setRepolling(false)
      return
    }
    if (!data.bestMeet) {
      setError('No full power meet found for this lifter on OpenPowerlifting.')
      setRepolling(false)
      return
    }
    const approveRes = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sub.id, action: 'approve', meet: data.bestMeet }),
    })
    if (!approveRes.ok) {
      const d = await approveRes.json()
      setError(d.error ?? 'Failed to update entry.')
      setRepolling(false)
      return
    }
    setRepollMsg(`Updated to best full power meet: ${data.bestMeet.meet_name} (${data.bestMeet.gl_points?.toFixed(4)} GL)`)
    setRepolling(false)
  }

  const weightClasses = WEIGHT_CLASSES[values.sex]

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1">Edit Entry</h2>
        <p className="text-xs text-zinc-500 mb-5 font-mono">{sub.opl_username}</p>

        {/* Repoll banner */}
        <div className="mb-5 p-3 bg-zinc-800 rounded-lg border border-zinc-700 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-400">Re-fetch latest data from OpenPowerlifting and update to best full power meet.</p>
          <button
            onClick={repoll}
            disabled={repolling || saving}
            className="shrink-0 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            {repolling ? 'Fetching...' : 'Repoll OPL'}
          </button>
        </div>
        {repollMsg && <p className="text-green-400 text-xs mb-4 bg-green-950/40 px-3 py-2 rounded-lg">{repollMsg}</p>}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="First Name"><input type="text" value={values.first_name} onChange={set('first_name')} className={ic} /></F>
            <F label="Last Name"><input type="text" value={values.last_name} onChange={set('last_name')} className={ic} /></F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Date"><input type="date" value={values.date} onChange={set('date')} max={new Date().toISOString().split('T')[0]} className={ic} /></F>
            <F label="Sex"><select value={values.sex} onChange={set('sex')} className={sc}><option value="M">Male</option><option value="F">Female</option></select></F>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <F label="Age"><input type="number" value={values.age} onChange={set('age')} min={13} max={100} className={ic} /></F>
            <F label="Bodyweight (kg)"><input type="number" value={values.bodyweight_kg} onChange={set('bodyweight_kg')} step={0.1} min={30} max={300} className={ic} /></F>
            <F label="Weight Class"><select value={values.weight_class} onChange={set('weight_class')} className={sc}>{weightClasses.map(wc => <option key={wc} value={wc}>{wc} kg</option>)}</select></F>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <F label="Squat (kg)"><input type="number" value={values.squat_kg} onChange={set('squat_kg')} step={0.5} min={0} placeholder="—" className={ic} /></F>
            <F label="Bench (kg)"><input type="number" value={values.bench_kg} onChange={set('bench_kg')} step={0.5} min={0} placeholder="—" className={ic} /></F>
            <F label="Deadlift (kg)"><input type="number" value={values.deadlift_kg} onChange={set('deadlift_kg')} step={0.5} min={0} placeholder="—" className={ic} /></F>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mt-4 bg-red-950/40 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-lg text-sm font-medium transition-colors">Cancel</button>
          <button onClick={save} disabled={saving || repolling} className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Cards ───────────────────────────────────────────────────────────────────

function PendingCard({ sub, onReview }: { sub: Submission; onReview: (s: Submission) => void }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-lg font-mono">{sub.opl_username}</p>
        <p className="text-xs text-zinc-500 mt-0.5">Submitted {fmtDate(sub.created_at)}</p>
      </div>
      <button
        onClick={() => onReview(sub)}
        className="bg-red-600 hover:bg-red-500 text-white text-sm px-5 py-2 rounded-lg font-medium transition-colors shrink-0"
      >
        Review
      </button>
    </div>
  )
}

function ApprovedCard({ sub, onEdit }: { sub: Submission; onEdit: (s: Submission) => void }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">
            {sub.first_name} {sub.last_name}
            <span className="ml-2 text-sm font-normal text-zinc-400">
              {sub.sex === 'M' ? 'Male' : 'Female'} &middot; {sub.weight_class} kg &middot; BW {fmt(sub.bodyweight_kg)} kg
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {sub.opl_username && <><span className="font-mono">{sub.opl_username}</span> &middot; </>}
            {sub.meet_name ?? sub.entry_type} &middot; {sub.date ? fmtDate(sub.date) : '—'}
          </p>
        </div>
        <button onClick={() => onEdit(sub)} className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0">
          Edit
        </button>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-3 text-center">
        {([['Squat', sub.squat_kg], ['Bench', sub.bench_kg], ['Deadlift', sub.deadlift_kg], ['Total', sub.total_kg]] as [string, number | null][]).map(([label, val]) => (
          <div key={label} className="bg-zinc-800/50 rounded-lg px-3 py-2">
            <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
            <p className="font-semibold text-sm">{fmt(val)} kg</p>
          </div>
        ))}
      </div>
      {sub.gl_points != null && (
        <p className="mt-3 text-right text-sm text-amber-400 font-semibold">GL Points: {fmt(sub.gl_points, 4)}</p>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>('loading')
  const [user, setUser]               = useState<User | null>(null)
  const [tab, setTab]                 = useState<AdminTab>('pending')
  const [pending, setPending]         = useState<Submission[]>([])
  const [approved, setApproved]       = useState<Submission[]>([])
  const [loading, setLoading]         = useState(false)
  const [reviewingSub, setReviewingSub] = useState<Submission | null>(null)
  const [editingSub, setEditingSub]   = useState<Submission | null>(null)
  const [search, setSearch]           = useState('')

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) { setAdminStatus('unauthenticated'); return }
      setUser(u)
      setAdminStatus(u.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? 'authorized' : 'unauthorized')
    })
  }, [])

  const loadPending = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/pending')
    if (res.ok) setPending(await res.json())
    setLoading(false)
  }, [])

  const loadApproved = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/approved')
    if (res.ok) setApproved(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (adminStatus !== 'authorized') return
    if (tab === 'pending') loadPending()
    else loadApproved()
  }, [adminStatus, tab, loadPending, loadApproved])

  async function handleApprove(id: string, meet: OPLMeet) {
    await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve', meet }),
    })
    setPending(prev => prev.filter(s => s.id !== id))
    setReviewingSub(null)
  }

  async function handleReject(id: string) {
    await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reject' }),
    })
    setPending(prev => prev.filter(s => s.id !== id))
    setReviewingSub(null)
  }

  function handleEdited(updated: Submission) {
    setApproved(prev => prev.map(s => s.id === updated.id ? updated : s))
    setEditingSub(null)
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=/admin` },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAdminStatus('unauthenticated')
    setUser(null)
  }

  if (adminStatus === 'loading') return <p className="text-zinc-400 py-20 text-center">Checking credentials...</p>

  if (adminStatus === 'unauthenticated') {
    return (
      <div className="max-w-sm mx-auto text-center py-24">
        <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
        <p className="text-zinc-400 text-sm mb-8">Sign in with your Google account to manage submissions.</p>
        <button onClick={signInWithGoogle} className="flex items-center gap-3 mx-auto bg-white text-zinc-900 font-medium px-6 py-3 rounded-lg hover:bg-zinc-100 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    )
  }

  if (adminStatus === 'unauthorized') {
    return (
      <div className="max-w-sm mx-auto text-center py-24">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-zinc-400 text-sm mb-6">{user?.email} is not authorised.</p>
        <button onClick={signOut} className="text-sm text-red-400 hover:text-red-300 underline">Sign out</button>
      </div>
    )
  }

  const filteredApproved = approved.filter(s =>
    `${s.first_name} ${s.last_name} ${s.opl_username}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {reviewingSub && (
        <OPLReviewModal
          sub={reviewingSub}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setReviewingSub(null)}
        />
      )}
      {editingSub && (
        <EditModal sub={editingSub} onSave={handleEdited} onClose={() => setEditingSub(null)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-zinc-400 text-sm mt-1">Signed in as {user?.email}</p>
        </div>
        <button onClick={signOut} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Sign out</button>
      </div>

      <div className="flex gap-1 mb-6 bg-zinc-900 rounded-lg p-1 w-fit">
        {(['pending', 'approved'] as AdminTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            {t}
            {t === 'pending' && pending.length > 0 && (
              <span className="ml-1.5 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-zinc-400 py-12 text-center">Loading...</p>
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <div className="text-center py-20 border border-zinc-800 rounded-xl bg-zinc-900/30">
            <p className="text-zinc-400">No pending submissions. You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(sub => (
              <PendingCard key={sub.id} sub={sub} onReview={setReviewingSub} />
            ))}
          </div>
        )
      ) : (
        <div>
          <input
            type="text" placeholder="Search by name or username..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600/50 mb-5"
          />
          {filteredApproved.length === 0 ? (
            <p className="text-zinc-500 py-12 text-center">No approved submissions found.</p>
          ) : (
            <div className="space-y-4">
              {filteredApproved.map(sub => (
                <ApprovedCard key={sub.id} sub={sub} onEdit={setEditingSub} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

const ic = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600'
const sc = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600'

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

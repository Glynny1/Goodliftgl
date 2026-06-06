'use client'

import { useState } from 'react'
import { WEIGHT_CLASSES, type Sex } from '@/lib/weight-classes'

interface FormData {
  first_name: string
  last_name: string
  date: string
  sex: Sex | ''
  age: string
  weight_class: string
  bodyweight_kg: string
  squat_kg: string
  bench_kg: string
  deadlift_kg: string
  entry_type: 'gym' | 'competition' | ''
}

const INITIAL: FormData = {
  first_name: '', last_name: '', date: '', sex: '', age: '',
  weight_class: '', bodyweight_kg: '', squat_kg: '', bench_kg: '',
  deadlift_kg: '', entry_type: '',
}

export default function SubmitPage() {
  const [form, setForm]     = useState<FormData>(INITIAL)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError]   = useState('')

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const weightClasses = form.sex ? WEIGHT_CLASSES[form.sex as Sex] : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError('')

    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        age: Number(form.age),
        bodyweight_kg: Number(form.bodyweight_kg),
        squat_kg: form.squat_kg ? Number(form.squat_kg) : null,
        bench_kg: form.bench_kg ? Number(form.bench_kg) : null,
        deadlift_kg: form.deadlift_kg ? Number(form.deadlift_kg) : null,
      }),
    })

    if (res.ok) {
      setStatus('success')
      setForm(INITIAL)
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
          Your lift has been submitted for review. It will appear on the leaderboard once approved.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="text-sm text-red-400 hover:text-red-300 underline"
        >
          Submit another lift
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">Submit a Lift</h1>
      <p className="text-zinc-400 text-sm mb-8">
        All submissions are reviewed before appearing on the leaderboard.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required>
            <input
              type="text" value={form.first_name} onChange={set('first_name')}
              required maxLength={50} className={inputCls}
            />
          </Field>
          <Field label="Last Name" required>
            <input
              type="text" value={form.last_name} onChange={set('last_name')}
              required maxLength={50} className={inputCls}
            />
          </Field>
        </div>

        {/* Date + Sex */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date of Lift" required>
            <input
              type="date" value={form.date} onChange={set('date')}
              required max={new Date().toISOString().split('T')[0]} className={inputCls}
            />
          </Field>
          <Field label="Sex" required>
            <select value={form.sex} onChange={set('sex')} required className={selectCls}>
              <option value="">Select...</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </Field>
        </div>

        {/* Age + Bodyweight */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Age" required>
            <input
              type="number" value={form.age} onChange={set('age')}
              required min={13} max={100} className={inputCls} placeholder="e.g. 28"
            />
          </Field>
          <Field label="Bodyweight (kg)" required>
            <input
              type="number" value={form.bodyweight_kg} onChange={set('bodyweight_kg')}
              required min={30} max={300} step={0.1} className={inputCls} placeholder="e.g. 82.4"
            />
          </Field>
        </div>

        {/* Weight class */}
        <Field label="Weight Class" required>
          <select value={form.weight_class} onChange={set('weight_class')} required className={selectCls} disabled={!form.sex}>
            <option value="">{form.sex ? 'Select class...' : 'Choose sex first'}</option>
            {weightClasses.map(wc => (
              <option key={wc} value={wc}>{wc} kg</option>
            ))}
          </select>
        </Field>

        {/* Lifts */}
        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Lifts (kg) — leave blank if not attempted</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Squat">
              <input
                type="number" value={form.squat_kg} onChange={set('squat_kg')}
                min={0} max={1200} step={0.5} className={inputCls} placeholder="—"
              />
            </Field>
            <Field label="Bench">
              <input
                type="number" value={form.bench_kg} onChange={set('bench_kg')}
                min={0} max={1000} step={0.5} className={inputCls} placeholder="—"
              />
            </Field>
            <Field label="Deadlift">
              <input
                type="number" value={form.deadlift_kg} onChange={set('deadlift_kg')}
                min={0} max={1500} step={0.5} className={inputCls} placeholder="—"
              />
            </Field>
          </div>
        </div>

        {/* Entry type */}
        <Field label="Entry Type" required>
          <select value={form.entry_type} onChange={set('entry_type')} required className={selectCls}>
            <option value="">Select...</option>
            <option value="gym">Gym (training max)</option>
            <option value="competition">Competition (sanctioned meet)</option>
          </select>
        </Field>

        {status === 'error' && (
          <p className="text-sm text-red-400 bg-red-950/40 px-4 py-3 rounded-lg border border-red-800">{error}</p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {status === 'sending' ? 'Submitting...' : 'Submit for Review'}
        </button>

        <p className="text-xs text-zinc-600 text-center">
          Submissions are reviewed before appearing on the leaderboard.
        </p>
      </form>
    </div>
  )
}

const inputCls = 'w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600'
const selectCls = 'w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 disabled:opacity-50'

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

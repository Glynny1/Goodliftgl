import { calcGLPoints } from './gl-points'
import type { Sex } from './weight-classes'

export interface OPLMeet {
  name: string
  sex: Sex
  equipment: string
  age: number | null
  bodyweight_kg: number | null
  weight_class: string
  squat_kg: number | null
  bench_kg: number | null
  deadlift_kg: number | null
  total_kg: number | null
  gl_points: number | null
  date: string
  federation: string
  meet_name: string
  division: string
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))
  })
}

export type OPLResult =
  | { meets: OPLMeet[]; lifterName: string; bestMeet: OPLMeet | null }
  | { error: string }

export async function fetchLifterData(username: string): Promise<OPLResult> {
  const res = await fetch(
    `https://www.openpowerlifting.org/api/liftercsv/${encodeURIComponent(username)}`,
    { headers: { 'User-Agent': 'GudLiftPR/1.0' }, next: { revalidate: 3600 } }
  )

  if (res.status === 404) return { error: 'Lifter not found on OpenPowerlifting.' }
  if (!res.ok) return { error: 'Failed to reach OpenPowerlifting.' }

  const rows = parseCSV(await res.text())

  const meets: OPLMeet[] = rows
    .filter(r => r.TotalKg && Number(r.TotalKg) > 0)
    .map(r => {
      const sex = (r.Sex as Sex) ?? 'M'
      const total = Number(r.TotalKg) || null
      const bw = Number(r.BodyweightKg) || null
      const gl = r.Goodlift && Number(r.Goodlift) > 0
        ? Number(r.Goodlift)
        : (total && bw ? calcGLPoints(total, bw, sex) : null)

      return {
        name: r.Name,
        sex,
        equipment: r.Equipment,
        age: r.Age ? Number(r.Age) : null,
        bodyweight_kg: bw,
        weight_class: r.WeightClassKg,
        squat_kg: r.Best3SquatKg ? Number(r.Best3SquatKg) : null,
        bench_kg: r.Best3BenchKg ? Number(r.Best3BenchKg) : null,
        deadlift_kg: r.Best3DeadliftKg ? Number(r.Best3DeadliftKg) : null,
        total_kg: total,
        gl_points: gl,
        date: r.Date,
        federation: r.Federation,
        meet_name: r.MeetName,
        division: r.Division,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const bestMeet = meets.reduce<OPLMeet | null>((best, m) => {
    if (!m.gl_points) return best
    // Leaderboard is full power only — skip bench-only, push-pull, deadlift-only etc.
    if (!m.squat_kg || !m.bench_kg || !m.deadlift_kg) return best
    if (!best || m.gl_points > (best.gl_points ?? 0)) return m
    return best
  }, null)

  return { meets, lifterName: rows[0]?.Name ?? username, bestMeet }
}

// Best full-power meet per equipment type (for multi-row leaderboard storage)
export function bestMeetPerEquipment(meets: OPLMeet[]): Record<string, OPLMeet> {
  const bests: Record<string, OPLMeet> = {}
  for (const m of meets) {
    if (!m.gl_points || !m.squat_kg || !m.bench_kg || !m.deadlift_kg) continue
    if (!bests[m.equipment] || m.gl_points > (bests[m.equipment].gl_points ?? 0)) {
      bests[m.equipment] = m
    }
  }
  return bests
}

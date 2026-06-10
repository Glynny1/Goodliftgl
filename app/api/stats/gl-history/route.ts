import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { fetchLifterData } from '@/lib/opl'

export interface HistoryPoint {
  opl_username: string
  date: string
  gl_points: number
  sex: 'M' | 'F'
  equipment: string
}

export async function GET() {
  const supabase = createAdminClient()
  const { data: approved } = await supabase
    .from('submissions')
    .select('opl_username, sex')
    .eq('status', 'approved')

  if (!approved || approved.length === 0) {
    return NextResponse.json({ meets: [] })
  }

  const results = await Promise.all(
    approved.map(async ({ opl_username, sex }: { opl_username: string; sex: string | null }) => {
      const result = await fetchLifterData(opl_username)
      if ('error' in result) return []
      return result.meets
        .filter(m => m.squat_kg && m.bench_kg && m.deadlift_kg && m.gl_points)
        .map(m => ({
          opl_username,
          date: m.date,
          gl_points: m.gl_points as number,
          sex: (sex ?? m.sex) as 'M' | 'F',
          equipment: m.equipment,
        }))
    })
  )

  return NextResponse.json({ meets: results.flat() })
}

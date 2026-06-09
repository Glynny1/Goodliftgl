import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import type { OPLMeet } from '../opl-lookup/route'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id, action, meet }: { id: string; action: 'approve' | 'reject'; meet?: OPLMeet } = await req.json()

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (action === 'approve' && !meet) {
    return NextResponse.json({ error: 'No meet selected.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  let update: Record<string, unknown> = { status: action === 'approve' ? 'approved' : 'rejected' }

  if (action === 'approve' && meet) {
    const nameParts = meet.name.trim().split(' ')
    update = {
      ...update,
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' '),
      date: meet.date,
      sex: meet.sex,
      age: meet.age,
      weight_class: meet.weight_class,
      bodyweight_kg: meet.bodyweight_kg,
      squat_kg: meet.squat_kg,
      bench_kg: meet.bench_kg,
      deadlift_kg: meet.deadlift_kg,
      total_kg: meet.total_kg,
      gl_points: meet.gl_points,
      entry_type: 'competition',
      meet_name: meet.meet_name,
      federation: meet.federation,
    }
  }

  const { error } = await supabase.from('submissions').update(update).eq('id', id)

  if (error) return NextResponse.json({ error: 'Database error.' }, { status: 500 })
  return NextResponse.json({ success: true })
}

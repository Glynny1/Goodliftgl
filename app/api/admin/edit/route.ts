import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import { calcGLPoints } from '@/lib/gl-points'
import type { Sex } from '@/lib/weight-classes'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const {
    id, first_name, last_name, date, sex, age,
    weight_class, bodyweight_kg, squat_kg, bench_kg, deadlift_kg,
    total_kg: total_kg_override, equipment, meet_name, federation, entry_type,
  } = await req.json()

  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

  const auto_total = (squat_kg ?? 0) + (bench_kg ?? 0) + (deadlift_kg ?? 0)
  const total_kg = total_kg_override ?? (auto_total > 0 ? auto_total : null)
  const gl_points = total_kg && bodyweight_kg && sex
    ? calcGLPoints(total_kg, bodyweight_kg, sex as Sex)
    : null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('submissions')
    .update({
      first_name: first_name?.trim(),
      last_name: last_name?.trim(),
      date, sex, age, weight_class, bodyweight_kg,
      squat_kg: squat_kg ?? null,
      bench_kg: bench_kg ?? null,
      deadlift_kg: deadlift_kg ?? null,
      total_kg,
      gl_points,
      equipment: equipment || null,
      meet_name: meet_name || null,
      federation: federation || null,
      entry_type,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Database error.' }, { status: 500 })
  return NextResponse.json(data)
}

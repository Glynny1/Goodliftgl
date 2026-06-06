import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { calcGLPoints } from '@/lib/gl-points'
import { WEIGHT_CLASSES, type Sex } from '@/lib/weight-classes'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      first_name, last_name, date, sex, age,
      weight_class, bodyweight_kg,
      squat_kg, bench_kg, deadlift_kg, entry_type,
    } = body

    // Basic validation
    if (!first_name || !last_name || !date || !sex || !age || !weight_class || !bodyweight_kg || !entry_type) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }
    if (!['M', 'F'].includes(sex)) {
      return NextResponse.json({ error: 'Invalid sex value.' }, { status: 400 })
    }
    if (!['gym', 'competition'].includes(entry_type)) {
      return NextResponse.json({ error: 'Invalid entry type.' }, { status: 400 })
    }
    const validClasses: readonly string[] = WEIGHT_CLASSES[sex as Sex]
    if (!validClasses.includes(weight_class)) {
      return NextResponse.json({ error: 'Invalid weight class for sex.' }, { status: 400 })
    }
    if (age < 13 || age > 100) {
      return NextResponse.json({ error: 'Age must be between 13 and 100.' }, { status: 400 })
    }
    if (bodyweight_kg <= 0 || bodyweight_kg > 300) {
      return NextResponse.json({ error: 'Invalid bodyweight.' }, { status: 400 })
    }

    const total_kg =
      (squat_kg ?? 0) + (bench_kg ?? 0) + (deadlift_kg ?? 0)

    const gl_points = total_kg > 0
      ? calcGLPoints(total_kg, bodyweight_kg, sex as Sex)
      : null

    const supabase = createAdminClient()
    const { error } = await supabase.from('submissions').insert({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      date,
      sex,
      age,
      weight_class,
      bodyweight_kg,
      squat_kg: squat_kg ?? null,
      bench_kg: bench_kg ?? null,
      deadlift_kg: deadlift_kg ?? null,
      total_kg: total_kg > 0 ? total_kg : null,
      gl_points,
      entry_type,
      status: 'pending',
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Database error. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
}

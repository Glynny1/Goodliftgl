import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import { fetchLifterData, bestMeetPerEquipment } from '@/lib/opl'
import type { OPLMeet } from '../opl-lookup/route'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
}

function meetToRow(m: OPLMeet, cleanName: string, opl_username: string) {
  const nameParts = cleanName.split(' ')
  return {
    opl_username,
    first_name: nameParts[0],
    last_name: nameParts.slice(1).join(' '),
    date: m.date,
    sex: m.sex,
    age: m.age != null ? Math.round(m.age) : null,
    weight_class: m.weight_class,
    bodyweight_kg: m.bodyweight_kg,
    squat_kg: m.squat_kg,
    bench_kg: m.bench_kg,
    deadlift_kg: m.deadlift_kg,
    total_kg: m.total_kg,
    gl_points: m.gl_points,
    equipment: m.equipment,
    entry_type: 'competition',
    meet_name: m.meet_name,
    federation: m.federation,
    status: 'approved',
  }
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

  if (action === 'reject') {
    const { error } = await supabase.from('submissions').update({ status: 'rejected' }).eq('id', id)
    if (error) {
      console.error('Reject DB error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message ?? 'Database error.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  // --- Approve ---

  // Fetch the submission to get opl_username
  const { data: sub, error: fetchError } = await supabase
    .from('submissions').select('opl_username').eq('id', id).single()

  if (fetchError || !sub) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
  }

  const opl_username = sub.opl_username

  // Fetch OPL to compute per-equipment bests
  const oplResult = await fetchLifterData(opl_username)
  const equipMeets = 'error' in oplResult ? {} : bestMeetPerEquipment(oplResult.meets)
  const allEquipMeets = Object.values(equipMeets)

  // Overall best (highest GL across all equipment types); fall back to provided meet if OPL fails
  const overallBest: OPLMeet = allEquipMeets.length > 0
    ? allEquipMeets.reduce((a, b) => (b.gl_points ?? 0) > (a.gl_points ?? 0) ? b : a)
    : meet!

  const cleanName = overallBest.name.trim().replace(/\s*#\d+$/, '')

  // Delete all other approved rows for this lifter (keeps the current id row for update below)
  await supabase
    .from('submissions')
    .delete()
    .eq('opl_username', opl_username)
    .eq('status', 'approved')
    .neq('id', id)

  // Update the current row with the overall best meet
  const { error } = await supabase
    .from('submissions')
    .update(meetToRow(overallBest, cleanName, opl_username))
    .eq('id', id)

  if (error) {
    console.error('Approve DB error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message ?? 'Database error.' }, { status: 500 })
  }

  // Insert one row per additional equipment type
  const otherRows = allEquipMeets
    .filter(m => m.equipment !== overallBest.equipment)
    .map(m => meetToRow(m, cleanName, opl_username))

  if (otherRows.length > 0) {
    const { error: insertError } = await supabase.from('submissions').insert(otherRows)
    if (insertError) console.error('Approve multi-equip insert error:', JSON.stringify(insertError))
  }

  return NextResponse.json({ success: true })
}

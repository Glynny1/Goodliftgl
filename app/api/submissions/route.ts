import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { extractOplUsername } from '@/lib/extract-opl-username'

export async function POST(req: Request) {
  try {
    const { opl_username } = await req.json()

    if (!opl_username || typeof opl_username !== 'string') {
      return NextResponse.json({ error: 'OpenPowerlifting username is required.' }, { status: 400 })
    }

    const username = extractOplUsername(opl_username)
    if (!username) {
      return NextResponse.json({ error: 'OpenPowerlifting username is required.' }, { status: 400 })
    }

    // Validate the username exists on OpenPowerlifting
    const oplRes = await fetch(`https://www.openpowerlifting.org/api/liftercsv/${username}`, {
      headers: { 'User-Agent': 'GudLiftPR/1.0' },
    })

    if (oplRes.status === 404) {
      return NextResponse.json(
        { error: `"${username}" was not found on OpenPowerlifting. Check the spelling and try again.` },
        { status: 400 }
      )
    }
    if (!oplRes.ok) {
      return NextResponse.json(
        { error: 'Could not reach OpenPowerlifting to verify your username. Please try again shortly.' },
        { status: 502 }
      )
    }

    // Check for duplicate pending/approved submission
    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('opl_username', username)
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (existing) {
      const msg = existing.status === 'approved'
        ? 'This OpenPowerlifting profile is already on the leaderboard.'
        : 'This OpenPowerlifting profile is already pending review.'
      return NextResponse.json({ error: msg }, { status: 409 })
    }

    const { error } = await supabase
      .from('submissions')
      .insert({ opl_username: username, status: 'pending' })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Database error. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
}

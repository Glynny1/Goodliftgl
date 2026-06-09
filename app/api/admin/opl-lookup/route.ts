import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { fetchLifterData } from '@/lib/opl'

export type { OPLMeet } from '@/lib/opl'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
}

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')
  if (!username) return NextResponse.json({ error: 'Missing username.' }, { status: 400 })

  const result = await fetchLifterData(username)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error.includes('not found') ? 404 : 502 })
  }

  return NextResponse.json(result)
}

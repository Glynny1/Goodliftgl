import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id, action } = await req.json()

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('submissions')
    .update({ status: action === 'approve' ? 'approved' : 'rejected' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Database error.' }, { status: 500 })
  return NextResponse.json({ success: true })
}

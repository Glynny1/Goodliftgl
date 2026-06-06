import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Database error.' }, { status: 500 })
  return NextResponse.json(data)
}

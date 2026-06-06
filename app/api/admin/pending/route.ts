import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'

async function isAdmin(req: Request): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
}

export async function GET(req: Request) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Database error.' }, { status: 500 })
  return NextResponse.json(data)
}

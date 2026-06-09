import { NextResponse } from 'next/server'
import { fetchLifterData } from '@/lib/opl'

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const result = await fetchLifterData(username)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error.includes('not found') ? 404 : 502 })
  }
  return NextResponse.json(result)
}

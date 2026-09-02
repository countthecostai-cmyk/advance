import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'

export async function GET(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { searchParams } = new URL(request.url)
  const limit = Math.min(200, Number(searchParams.get('limit') || 50))

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ logs: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Close all open matches whose deadline has passed
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('matches')
    .update({ voting_status: 'closed' })
    .eq('voting_status', 'open')
    .lt('voting_closes_at', now)
    .select('id, match_date')

  if (error) {
    console.error('[cron/close-voting] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[cron/close-voting] Closed ${data?.length ?? 0} match(es)`)
  return NextResponse.json({ closed: data?.length ?? 0, matches: data })
}

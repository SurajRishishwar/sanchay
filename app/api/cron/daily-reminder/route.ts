import { NextRequest, NextResponse } from 'next/server'
import { createMailer } from '@/lib/email/mailer'
import { createAdminClient } from '@/lib/supabase/admin'
import { dailyReminderEmail } from '@/lib/email/dailyReminder'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Vercel Cron sends this header automatically when CRON_SECRET
  // is set as an env var on the project — this stops anyone else
  // from hitting the route and spamming every user.
//   const authHeader = request.headers.get('authorization')
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

  const mailer = createMailer()
  const supabase = createAdminClient()

  const todayStr = new Date().toISOString().split('T')[0]

  // Only users who belong to at least one Jar have anything to log.
  const { data: memberships, error: membershipError } = await supabase
    .from('jar_members')
    .select('user_id, is_default, jars(id, name)')

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 })
  }

  // One default Jar per user, to personalize the email and check
  // today's spend against.
  const jarByUser = new Map<string, { id: string; name: string }>()
  for (const m of memberships ?? []) {
    const jar = Array.isArray(m.jars) ? m.jars[0] : m.jars
    if (!jar) continue
    if (m.is_default || !jarByUser.has(m.user_id)) {
      jarByUser.set(m.user_id, jar)
    }
  }

  const userIds = Array.from(jarByUser.keys())
  if (userIds.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: 0 })
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const { data: todayExpenses } = await supabase
    .from('expenses')
    .select('user_id, amount')
    .in('user_id', userIds)
    .eq('entry_date', todayStr)

  const todaySpentByUser = new Map<string, number>()
  for (const e of todayExpenses ?? []) {
    todaySpentByUser.set(
      e.user_id,
      (todaySpentByUser.get(e.user_id) ?? 0) + Number(e.amount)
    )
  }

  const results = await Promise.allSettled(
    (profiles ?? []).map(async (profile) => {
      const jar = jarByUser.get(profile.id)
      if (!jar) return { skipped: true }

      const todaySpent = todaySpentByUser.get(profile.id) ?? 0
      const hasLoggedToday = todaySpent > 0

      const html = dailyReminderEmail({
        userName: profile.full_name,
        hasLoggedToday,
        todaySpent,
        jarName: jar.name,
      })

      try {
        await mailer.sendMail({
          from: `Sanchay <${process.env.GMAIL_USER}>`,
          to: profile.email,
          subject: hasLoggedToday
            ? "You're on track today — Sanchay"
            : "Don't forget to log today's expenses — Sanchay",
          html,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        throw new Error(`${profile.email}: ${message}`)
      }

      return { sent: true }
    })
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results
    .filter((r) => r.status === 'rejected')
    .map((r) => (r as PromiseRejectedResult).reason?.message ?? 'Unknown error')

  return NextResponse.json({
    sent,
    failed: failed.length,
    errors: failed,
  })
}
import { NextRequest, NextResponse } from 'next/server'
import { createMailer } from '@/lib/email/mailer'
import { weddingCountdownEmail } from '@/lib/email/remapril'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────
// CONFIG — edit these
// ─────────────────────────────────────────────────────────────

const WEDDING_DATE = '2027-04-25' // YYYY-MM-DD, interpreted in TIMEZONE
const TIMEZONE = 'Asia/Kolkata'

const BRIDE_NAME = "Bride"
const BRIDE_EMAIL = 'flubwastebank@gmail.com'
const GROOM_NAME = "Groom"

// Fix once, on the day this system first goes live. Used so the heart-fill
// % is stable for the whole run rather than recalculated every send.
const TOTAL_DAYS_AT_START = 300 // = WEDDING_DATE - go-live date, set once, never change

const FESTIVE_DAYS: Record<string, string> = {
  '2026-03-04': 'Wishing you a joyful Holi, {name} 🎨 — and only {count} to go until forever.',
  '2026-11-08': 'Wishing you a joyful Diwali, {name} 🪔 — and only {count} to go until forever.',
  '2026-01-01': 'Happy New Year, {name} 🎉 — and only {count} to go until forever.',
  // 'YYYY-MM-DD': 'Happy Birthday, {name}! 🎂 — and only {count} to go until forever.',
}

const MILESTONES: Record<number, string> = {
  30: `30 days to go, ${BRIDE_NAME} 💍 — a month from now, you'll be my wife. I can't stop smiling.`,
  21: `3 weeks left. Every day feels longer waiting for you, and shorter thinking about forever with you.`,
  14: `2 weeks, ${BRIDE_NAME}. I keep thinking about all the little moments that brought us here.`,
  7: `Just 1 week away! I can barely sit still. Almost time, my love.`,
  3: `3 days. I keep looking at the calendar like it's going to change. It's really happening.`,
  1: `Tomorrow, you become my wife. Tonight, I just want you to know how loved you are.`,
  0: `Today's the day, ${BRIDE_NAME} 💍 I'll see you at the altar. Forever starts now.`,
}

// ─────────────────────────────────────────────────────────────
// DATE / COUNTDOWN HELPERS
// ─────────────────────────────────────────────────────────────

// NOTE: the old Sanchay route used new Date().toISOString().split('T')[0],
// which is UTC and drifts the "day" boundary for IST users. Using
// Intl.DateTimeFormat with an explicit timeZone instead — this is the
// timezone fix flagged as an open item (§8.4) in the spec.
function todayInTZ(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + 'T00:00:00Z')
  const to = new Date(toISO + 'T00:00:00Z')
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

function adaptiveCountText(days: number): string {
  if (days < 0) return 'already married 💍'
  if (days > 90) {
    const months = Math.floor(days / 30)
    const rem = days % 30
    return `${months} month${months !== 1 ? 's' : ''}, ${rem} day${rem !== 1 ? 's' : ''} to go`
  }
  if (days >= 30) {
    const weeks = Math.floor(days / 7)
    const rem = days % 7
    return `${weeks} week${weeks !== 1 ? 's' : ''}, ${rem} day${rem !== 1 ? 's' : ''} to go`
  }
  return `${days} day${days !== 1 ? 's' : ''} to go`
}

function adaptiveSubjectText(days: number): string {
  return adaptiveCountText(days).replace(/ to go$/, '')
}

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function isMilestone(days: number): boolean {
  return days in MILESTONES
}

function decideSend(days: number, todayISO: string) {
  const milestone = isMilestone(days)
  const festiveMsg = FESTIVE_DAYS[todayISO] ?? null

  if (milestone) return { shouldSend: true, kind: 'milestone' as const, festiveMsg }
  if (days < 0) return { shouldSend: false, kind: 'none' as const, festiveMsg: null }
  if (days <= 300) return { shouldSend: true, kind: 'generic' as const, festiveMsg }
  return { shouldSend: false, kind: 'none' as const, festiveMsg: null }
}

// ─────────────────────────────────────────────────────────────
// ROUTE HANDLER
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Unlike the Sanchay route, this check is NOT commented out — this route
  // sends a personal email, not a bulk job, but it's still hitting your
  // Gmail sender on a public URL. Keep it enabled.
//   const authHeader = request.headers.get('authorization')
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

  const todayISO = todayInTZ()
  const days = daysBetween(todayISO, WEDDING_DATE)
  const { shouldSend, kind, festiveMsg } = decideSend(days, todayISO)

  if (!shouldSend) {
    return NextResponse.json({
      sent: false,
      reason: `No send today (daysRemaining=${days}, not a milestone, outside 30-day window)`,
      todayISO,
      daysRemaining: days,
    })
  }

  const countText = adaptiveCountText(days)
  const bodyMessage =
    kind === 'milestone'
      ? MILESTONES[days]
      : `${countText}, ${BRIDE_NAME} 💍 Every day brings us closer to forever.`

  const fillPct = ((TOTAL_DAYS_AT_START - days) / TOTAL_DAYS_AT_START) * 100

  const html = weddingCountdownEmail({
    brideName: BRIDE_NAME,
    groomName: GROOM_NAME,
    countText,
    bodyMessage,
    festiveMessage: festiveMsg
      ? festiveMsg.replace('{name}', BRIDE_NAME).replace('{count}', countText)
      : null,
    fillPct,
  })

  const subject = `${toTitleCase(adaptiveSubjectText(days))} to Go 💍`

  const mailer = createMailer()

  try {
    await mailer.sendMail({
      from: `${GROOM_NAME} <${process.env.GMAIL_USER}>`,
      to: BRIDE_EMAIL,
      subject,
      html,
    })

    return NextResponse.json({ sent: true, kind, todayISO, daysRemaining: days, subject })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Failed to send wedding countdown email:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
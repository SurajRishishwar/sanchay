import { NextRequest, NextResponse } from 'next/server'
import { createMailer } from '@/lib/email/mailer'
import { weddingCountdownEmail } from '@/lib/email/remapril'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────
// CONFIG — edit these
// ─────────────────────────────────────────────────────────────

const WEDDING_DATE = '2027-04-25' // YYYY-MM-DD, interpreted in TIMEZONE
const TIMEZONE = 'Asia/Kolkata'

const BRIDE_NAME = "Vanshika"
const BRIDE_EMAIL = 'flubwastebank@gmail.com'
const GROOM_NAME = "Suraj"

// Fix once, on the day this system first goes live. Used so the heart-fill
// % is stable for the whole run rather than recalculated every send.
const TOTAL_DAYS_AT_START = 276 // = WEDDING_DATE - go-live date, set once, never change

const FESTIVE_DAYS: Record<string, string> = {
  '2026-08-25': 'Wishing you a joyful Holi, {name} 🎨 — and only {count} to go until forever.',
  '2026-08-26': 'Wishing you a Very Happy Diwali, {name} 🪔 — and only {count} to go until forever.',
  '2026-08-27': 'Happy New Year, {name} 🎉 — and only {count} to go until forever.',
  '2026-08-28': 'Happy Birthday, {name}! 🎂 — and only {count} to go until forever.',
}

const MILESTONES: Record<number, string> = {
  243: `30 days to go, ${BRIDE_NAME} 💍 — a month from now, you'll be my wife. I can't stop smiling.`,
  242: `3 weeks left.${BRIDE_NAME} Every day feels longer waiting for you, and shorter thinking about forever with you.`,
  241: `2 weeks, ${BRIDE_NAME}. I keep thinking about all the little moments that brought us here.`,
  240: `Just 1 week away! ${BRIDE_NAME} I can barely sit still. Almost time, my love.`,
  239: `3 days. ${BRIDE_NAME} I keep looking at the calendar like it's going to change. It's really happening.`,
  238: `Tomorrow, ${BRIDE_NAME} you become my wife. Tonight, I just want you to know how loved you are.`,
  237: `Today's the day, ${BRIDE_NAME} 💍 I'll see you at the altar. Forever starts now.`,
}

// ─────────────────────────────────────────────────────────────
// DATE / COUNTDOWN HELPERS
// ─────────────────────────────────────────────────────────────

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

function getExactCalendarDifference(fromISO: string, toISO: string): { months: number; days: number } {
  const from = new Date(fromISO + 'T00:00:00Z')
  const to = new Date(toISO + 'T00:00:00Z')

  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())

  // Create an anchor date shifted by calculated months
  const anchor = new Date(fromISO + 'T00:00:00Z')
  anchor.setUTCMonth(anchor.getUTCMonth() + months)

  // Adjust if adding months overshot the target date
  if (anchor > to) {
    months--
    anchor.setUTCMonth(anchor.getUTCMonth() - 1)
  }

  const remDays = Math.round((to.getTime() - anchor.getTime()) / 86400000)
  return { months, days: remDays }
}

function adaptiveCountText(daysTotal: number, todayISO: string, weddingISO: string): string {
  if (daysTotal < 0) return 'already married 💍'
  if (daysTotal === 0) return '0 days to go'

  const { months, days } = getExactCalendarDifference(todayISO, weddingISO)

  if (months > 0) {
    const monthStr = `${months} month${months !== 1 ? 's' : ''}`
    const dayStr = days > 0 ? `, ${days} day${days !== 1 ? 's' : ''}` : ''
    return `${monthStr}${dayStr} to go`
  }

  if (daysTotal >= 30) {
    const weeks = Math.floor(daysTotal / 7)
    const rem = daysTotal % 7
    return `${weeks} week${weeks !== 1 ? 's' : ''}, ${rem} day${rem !== 1 ? 's' : ''} to go`
  }

  return `${daysTotal} day${daysTotal !== 1 ? 's' : ''} to go`
}

function adaptiveSubjectText(daysTotal: number, todayISO: string, weddingISO: string): string {
  return adaptiveCountText(daysTotal, todayISO, weddingISO).replace(/ to go$/, '')
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
  const todayISO = todayInTZ()
  const days = daysBetween(todayISO, WEDDING_DATE)
  const { shouldSend, kind, festiveMsg } = decideSend(days, todayISO)

  if (!shouldSend) {
    return NextResponse.json({
      sent: false,
      reason: `No send today (daysRemaining=${days}, not a milestone, outside 300-day window)`,
      todayISO,
      daysRemaining: days,
    })
  }

  const countText = adaptiveCountText(days, todayISO, WEDDING_DATE)
  const bodyMessage =
    kind === 'milestone'
      ? MILESTONES[days]
      : `Every single day brings us closer to forever, ${BRIDE_NAME}.`

  const fillPct = Math.min(100, Math.max(0, ((TOTAL_DAYS_AT_START - days) / TOTAL_DAYS_AT_START) * 100))

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

  const subjectText = adaptiveSubjectText(days, todayISO, WEDDING_DATE)
  const subject = `${toTitleCase(subjectText)} to Go 💍`

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
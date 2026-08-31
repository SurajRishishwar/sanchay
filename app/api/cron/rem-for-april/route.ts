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
// const BRIDE_EMAIL = 'vs8278013@gmail.com'
const BRIDE_EMAIL = 'flubwastebank@gmail.com'
const GROOM_NAME = "Suraj"

// Fix once, on the day this system first goes live. Used so the heart-fill
// % is stable for the whole run rather than recalculated every send.
const TOTAL_DAYS_AT_START = 276 // = WEDDING_DATE - go-live date, set once, never change

const FESTIVE_DAYS: Record<string, string> = {
  '2027-03-22': 'Wishing you a joyful Holi, {name} 🎨 — and only {count} until forever.',
  '2026-11-08': 'Happy Birthday, {name}! 🎂 & Wishing you a Very Happy Diwali, 🪔 — and only {count} until forever.',
  '2027-01-01': 'Happy New Year, {name} 🎉 — and only {count}  until forever.',
  '2026-09-14': 'Happy Ganesh Chaturthi, {name}! God Ganesha will always with you — and only {count} until forever.',
  '2026-12-25': 'Merry Christmas, {name} 🎉🎉 — and only {count} until forever.',
}

const MILESTONES: Record<number, string> = {
  100: `100 days to go, ${BRIDE_NAME} 💍 — just 100 day's from now, I catch myself smiling every time I realize how close we are.`, 
  50: `50 days to go, ${BRIDE_NAME} 💍 — just more than a month from now, you'll be my life. I can't stop smiling.`,  
  30: `30 days to go, ${BRIDE_NAME} 💍 — a month from now, I get to call you my wife. My heart is so full.`,
  21: `3 weeks left, ${BRIDE_NAME} Every day feels longer waiting for you, and shorter thinking about forever with you.`,
  14: `2 weeks left, ${BRIDE_NAME} I keep thinking about all the little moments that brought us here.`,
  7: `Just 1 week away! ${BRIDE_NAME} I can barely sit still. Almost time, my love.`,
  5: `5 days. ${BRIDE_NAME} I keep looking at the calendar like it's going to change. It's really happening.`,
  1: `Tomorrow, ${BRIDE_NAME} you become my wife. Tonight, I just want you to know how loved you are.`,
  0: `Today's the day, ${BRIDE_NAME} 💍 I'll see you at your place. Forever starts now.`,
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
  // Days in each month for the timeline from August 2026 to April 2027
  // [Aug=31, Sep=30, Oct=31, Nov=30, Dec=31, Jan=31, Feb=28, Mar=31, Apr=30]
  const MONTH_LENGTHS: Record<number, number> = {
    7: 31, 8: 30, 9: 31, 10: 30, 11: 31, 0: 31, 1: 28, 2: 31, 3: 30
  }

  let remDays = daysBetween(fromISO, toISO)
  if (remDays <= 0) return { months: 0, days: 0 }

  const from = new Date(fromISO + 'T00:00:00Z')
  let currentMonthIndex = from.getUTCMonth()
  let months = 0

  while (remDays > 0) {
    const daysInMonth = MONTH_LENGTHS[currentMonthIndex] ?? 30
    if (remDays >= daysInMonth) {
      remDays -= daysInMonth
      months++
      currentMonthIndex = (currentMonthIndex + 1) % 12
    } else {
      break
    }
  }

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

  const dayOfMonth = parseInt(todayISO.split('-')[2], 10)
  const isMultipleOfThree = dayOfMonth % 3 === 0

  // 1. Always send on Milestones & Holidays
  if (milestone) return { shouldSend: true, kind: 'milestone' as const, festiveMsg, reason: null }
  if (festiveMsg) return { shouldSend: true, kind: 'generic' as const, festiveMsg, reason: null }
  if (days < 0) return { shouldSend: false, kind: 'none' as const, festiveMsg: null, reason: 'Already married' }

  // 2. Daily emails in the final 30 days before the wedding
  if (days <= 30) return { shouldSend: true, kind: 'generic' as const, festiveMsg, reason: null }

  // 3. Every 3rd day of the month for general long-term countdown
  if (isMultipleOfThree && days <= 300) {
    return { shouldSend: true, kind: 'generic' as const, festiveMsg, reason: null }
  }

  return { 
    shouldSend: false, 
    kind: 'none' as const, 
    festiveMsg: null, 
    reason: `Skipped: Day of month (${dayOfMonth}) is not a multiple of 3` 
  }
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
      from: `"${GROOM_NAME}'s Love" <${process.env.GMAIL_USER}>`,
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
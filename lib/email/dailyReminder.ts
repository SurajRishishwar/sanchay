// Builds the HTML for the daily expense-logging reminder email.
// Inline styles throughout — most email clients (Gmail, Outlook)
// strip <style> blocks, so everything has to be inline to render
// consistently.

export function dailyReminderEmail({
  userName,
  hasLoggedToday,
  todaySpent,
  jarName,
}: {
  userName: string
  hasLoggedToday: boolean
  todaySpent: number
  jarName: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-app-url.vercel.app'

  const heading = hasLoggedToday ? "Nice, you're on track" : "Don't forget today's expenses"

  const body = hasLoggedToday
    ? `You've already logged ₹${todaySpent.toLocaleString('en-IN')} today in <strong>${jarName}</strong>. Add anything else before the day ends.`
    : `You haven't logged anything in <strong>${jarName}</strong> today yet. Take a moment to add today's expenses so nothing gets forgotten.`

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color:#ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

            <!-- Header -->
            <tr>
              <td style="background-color:#111827; padding: 24px 32px;">
                <p style="margin:0; font-size: 18px; font-weight: 700; color:#ffffff; letter-spacing: 0.02em;">Sanchay</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 32px;">
                <p style="margin:0 0 8px 0; font-size: 20px; font-weight: 700; color:#111827;">
                  ${heading}
                </p>
                <p style="margin:0 0 24px 0; font-size: 15px; line-height: 1.6; color:#4b5563;">
                  Hi ${userName}, ${body}
                </p>

                <a href="${appUrl}" style="display:inline-block; background-color:#111827; color:#ffffff; text-decoration:none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
                  Open Sanchay →
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px; background-color:#f9fafb; border-top: 1px solid #e5e7eb;">
                <p style="margin:0; font-size: 12px; color:#9ca3af;">
                  You're receiving this because you're a member on Sanchay. This is a daily reminder to help keep your expense log up to date.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}
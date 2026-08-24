// Builds the HTML for the wedding countdown email.
// Inline styles throughout — most email clients (Gmail, Outlook)
// strip <style> blocks, so everything has to be inline to render
// consistently. Mirrors the structure of dailyReminderEmail.

export function weddingCountdownEmail({
  brideName,
  groomName,
  countText,
  bodyMessage,
  festiveMessage,
  fillPct,
}: {
  brideName: string
  groomName: string
  countText: string
  bodyMessage: string
  festiveMessage: string | null
  fillPct: number
}) {
  const heading = `${countText} 💍`

  const festiveBlock = festiveMessage
    ? `
              <tr>
                <td style="padding: 0 32px 20px 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff3e0; border: 1px solid #f0c987; border-radius: 12px;">
                    <tr>
                      <td style="padding: 12px 16px;">
                        <p style="margin:0; font-size: 14px; line-height: 1.5; color:#8a5a12;">
                          ${festiveMessage}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`
    : ''

  const heart = heartProgressHTML(fillPct)

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#faf3ee; font-family: Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf3ee; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color:#fffdfb; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #f1ddd0;">

            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg,#f6dbe4,#f0c987); padding: 28px 32px; text-align:center;">
                <p style="margin:0; font-size: 12px; font-weight: 700; color:#7a4a2b; letter-spacing: 0.15em; text-transform: uppercase;">Countdown to Forever</p>
                <p style="margin:6px 0 0 0; font-size: 22px; font-weight: 700; color:#5a3921;">${groomName} &amp; ${brideName}</p>
                <p style="margin:4px 0 0 0; font-size: 13px; color:#7a4a2b;">August 28</p>
              </td>
            </tr>

            <!-- Heart progress bar -->
            <tr>
              <td style="padding: 28px 32px 8px 32px; text-align:center;">
                ${heart}
              </td>
            </tr>

            <!-- Day count -->
            <tr>
              <td style="padding: 0 32px 20px 32px; text-align:center;">
                <p style="margin:0; font-size: 20px; font-weight: 700; color:#c2185b;">
                  ${heading}
                </p>
              </td>
            </tr>
${festiveBlock}
            <!-- Body message -->
            <tr>
              <td style="padding: 0 32px 28px 32px; text-align:center;">
                <p style="margin:0; font-size: 16px; line-height: 1.6; color:#4a3826;">
                  ${bodyMessage}
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px; background-color:#fdf3f6; border-top: 1px solid #f1ddd0; text-align:center;">
                <p style="margin:0; font-size: 13px; font-style: italic; color:#a0785f;">
                  With all my love, ${groomName}
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

function heartProgressHTML(fillPct: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(fillPct)))

  return `
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto; text-align: center;">
      <!-- Heart Icon -->
      <tr>
        <td style="font-size: 38px; line-height: 1; padding-bottom: 8px;">
          ❤️
        </td>
      </tr>
      <!-- Progress Bar Track -->
      <tr>
        <td>
          <table role="presentation" width="200" cellpadding="0" cellspacing="0" style="background-color: #fdf3f6; border: 1px solid #d88fae; border-radius: 10px; height: 14px; overflow: hidden; margin: 0 auto;">
            <tr>
              <!-- Progress Bar Fill -->
              <td width="${pct}%" style="background-color: #e8a0bf; height: 14px; border-radius: 8px;"></td>
              <!-- Remaining Space -->
              <td width="${100 - pct}%"></td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Percentage Text -->
      <tr>
        <td style="padding-top: 6px; font-size: 11px; color: #a0785f; font-weight: bold;">
          ${pct}% Complete
        </td>
      </tr>
    </table>
  `.trim()
}
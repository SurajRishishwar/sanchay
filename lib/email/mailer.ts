import nodemailer from 'nodemailer'

// Sends mail through Gmail's SMTP server using an App Password.
// Free, works for any recipient, no domain verification needed —
// the tradeoff is the "from" address is your own Gmail address,
// not a custom branded one.
export function createMailer() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}
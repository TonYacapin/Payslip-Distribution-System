import nodemailer from "nodemailer"

interface EmailConfig {
  host: string
  port: number
  user: string
  password: string
  from: string
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  attachments: Array<{
    filename: string
    content: Buffer
  }>
  config: EmailConfig
}

export async function sendEmail({ to, subject, html, attachments, config }: EmailOptions) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: true,
    auth: {
      user: config.user,
      pass: config.password,
    },
  })

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
    attachments,
  })
}
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
    // Add connection timeout
    connectionTimeout: 10000, // 10 seconds
    // Add greeting timeout
    greetingTimeout: 5000, // 5 seconds
  })

  // Verify connection configuration
  await transporter.verify()

  const mailOptions = {
    from: config.from,
    to,
    subject,
    html,
    attachments,
    // Add delivery timeout
    timeout: 30000, // 30 seconds
  }

  await transporter.sendMail(mailOptions)
}
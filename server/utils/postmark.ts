// server/utils/postmark.ts
import { $fetch } from 'ofetch'

export async function sendMail(options: {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  from?: string
  tag?: string
  messageStream?: string
}) {
  const config = useRuntimeConfig()
  const token = process.env.POSTMARK_TOKEN || config.POSTMARK_TOKEN
  if (!token) throw new Error('Missing POSTMARK_TOKEN')

  const from = options.from || process.env.MAIL_FROM || config.MAIL_FROM
  if (!from) throw new Error('Missing MAIL_FROM')

  const to = Array.isArray(options.to) ? options.to.join(',') : options.to
  const MessageStream = options.messageStream || process.env.POSTMARK_MESSAGE_STREAM || 'outbound'

  const body = {
    From: from,
    To: to,
    Subject: options.subject,
    HtmlBody: options.html,
    TextBody: options.text,
    MessageStream,
    Tag: options.tag,
  }

  return $fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body,
  })
}

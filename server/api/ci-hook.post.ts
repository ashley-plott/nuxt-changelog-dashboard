// server/api/ci-hook.post.ts
import { H3Event, createError, readBody, getHeader } from 'h3'

type BuildPayload = {
  repo: string
  env?: string
  status: 'success' | 'failure' | 'cancelled' | 'in_progress'
  run: {
    git_branch: string
    git_sha: string
    ci_url: string
    run_id?: string | number
  }
  metadata?: Record<string, any>
}

export default defineEventHandler(async (event: H3Event) => {
  // --- auth ---
  const auth = getHeader(event, 'authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const { ciWebhookToken, postmarkToken, postmarkFrom, postmarkTo } = useRuntimeConfig()
  if (!token || token !== ciWebhookToken) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // --- validate body ---
  const body = (await readBody(event)) as Partial<BuildPayload>
  if (!body?.repo || !body?.status || !body?.run?.git_sha || !body?.run?.git_branch || !body?.run?.ci_url) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const now = new Date().toISOString()
  const env = body.env ?? 'production'
  const record = {
    repo: body.repo,
    env,
    status: body.status,
    run: body.run,
    metadata: body.metadata ?? {},
    receivedAt: now,
  }

  // --- persist latest + historical ---
  const storage = useStorage()
  const baseKey = `ci:builds:${body.repo}:${env}`
  const itemKey = `${baseKey}:${body.run!.git_sha}:${body.run!.run_id ?? 'noid'}`
  await storage.setItem(itemKey, record)
  await storage.setItem(`${baseKey}:latest`, record)

  // --- email only on failure, once per run ---
  if (record.status === 'failure' && postmarkToken && postmarkFrom && postmarkTo) {
    const notifyKey = `ci:notify:${body.repo}:${env}:${body.run!.run_id ?? body.run!.git_sha}`
    const alreadySent = await storage.getItem(notifyKey)
    if (!alreadySent) {
      const shortSha = body.run!.git_sha.slice(0, 7)
      const subject = `❌ CI failed: ${body.repo}@${body.run!.git_branch} (${shortSha})`
      const text = [
        `Workflow: ${record.metadata?.workflow ?? ''}`,
        `Repo: ${body.repo}`,
        `Branch: ${body.run!.git_branch}`,
        `SHA: ${body.run!.git_sha}`,
        `Actor: ${record.metadata?.actor ?? ''}`,
        `Run URL: ${body.run!.ci_url}`,
        `Environment: ${env}`,
        `Received: ${now}`
      ].join('\n')

      try {
        await $fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': postmarkToken
          },
          body: {
            From: postmarkFrom,
            To: postmarkTo,
            Subject: subject,
            TextBody: text,
            MessageStream: 'outbound',
            Tag: 'ci-failure'
          }
        })
        await storage.setItem(notifyKey, { sentAt: now })
      } catch (err) {
        // Don’t block the webhook response on email errors; just log
        console.error('[ci-hook] postmark send failed:', err)
      }
    }
  }

  return record
})

// server/api/utils/ping.post.ts
import { defineEventHandler, readBody } from 'h3'
import { pingUrl } from '../../utils/ping'
export default defineEventHandler(async (event) => {
  const { url, timeoutMs, className } = await readBody(event)
  return await pingUrl(url, { timeoutMs, className }) // includes hasMaintainClass
})

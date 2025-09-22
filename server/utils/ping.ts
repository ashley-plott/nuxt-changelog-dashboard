// server/utils/ping.ts
export async function pingUrl(rawUrl: string, opts?: { timeoutMs?: number; className?: string }) {
  const timeoutMs = Math.max(1000, Number(opts?.timeoutMs ?? 8000))
  const className = String(opts?.className || 'plott-maintain').trim()
  const url = normalizeUrl(rawUrl)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = Date.now()

  try {
    // Always GET HTML so we can inspect the header
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // be explicit: we want HTML
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Plott-Maint-Checker/1.0 (+scheduler)'
      }
    })

    const timeMs = Date.now() - started

    // Try to read body (limit to ~1MB to be safe)
    let html = ''
    try {
      const text = await res.text()
      html = text.length > 1_000_000 ? text.slice(0, 1_000_000) : text
    } catch {
      // ignore body read errors; we can still report status
    } finally {
      clearTimeout(timer)
    }

    // Extract <header>…</header> block (case-insensitive)
    let headerHtml = ''
    if (html) {
      const m = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i)
      headerHtml = m ? m[0] : ''
    }

    // Check for class in HEADER only
    const hasMaintainClass =
      !!headerHtml &&
      new RegExp(`\\bclass\\b\\s*=\\s*["'][^"']*\\b${escapeForRegExp(className)}\\b`, 'i').test(headerHtml)

    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      finalUrl: res.url,
      timeMs,
      hasMaintainClass,          // <-- important bit
      checked: `<header> has ".${className}"`
    }
  } catch (err: any) {
    const timeMs = Date.now() - started
    clearTimeout(timer)
    return {
      ok: false,
      error:
        err?.name === 'AbortError'
          ? `Timeout after ${timeoutMs}ms`
          : (err?.message || String(err)),
      timeMs,
      hasMaintainClass: false,
      checked: `<header> has ".${className}"`
    }
  }
}

function normalizeUrl(u?: string) {
  const s = (u || '').trim()
  if (!s) throw new Error('Empty URL')
  try {
    return new URL(s.startsWith('http') ? s : `https://${s}`).toString()
  } catch {
    throw new Error('Invalid URL')
  }
}

// Escape user-provided className for use inside a regex
function escapeForRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

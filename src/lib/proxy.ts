const PROXY_BASE = 'http://localhost:58080'
const DEFAULT_TIMEOUT_MS = 30_000

export async function checkProxy(): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_BASE}/health`)
    if (!res.ok) return false
    const data = await res.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}

export async function proxyFetch(
  targetUrl: string,
  options?: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number },
): Promise<{ status: number; headers: Record<string, string>; body: unknown; time: number }> {
  const method = options?.method || 'GET'
  const start = performance.now()
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const url = `${PROXY_BASE}/proxy?target=${encodeURIComponent(targetUrl)}`
  const init: RequestInit = { method, signal: controller.signal }

  if (options?.headers) {
    init.headers = { ...options.headers, 'X-Proxy-Target': targetUrl }
  }
  if (options?.body) {
    init.body = options.body
  }

  let res: Response
  try {
    res = await fetch(url, init)
  } finally {
    clearTimeout(timer)
  }

  const time = Math.round(performance.now() - start)

  const resHeaders: Record<string, string> = {}
  res.headers.forEach((value, key) => {
    resHeaders[key] = value
  })

  let body: unknown
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
  } else {
    body = await res.text()
  }

  return { status: res.status, headers: resHeaders, body, time }
}

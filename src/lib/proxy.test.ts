import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('proxyFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('成功响应 JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ data: 'ok' }),
    }))

    const { proxyFetch } = await import('./proxy')
    const result = await proxyFetch('https://api.example.com/data')
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ data: 'ok' })
    expect(typeof result.time).toBe('number')
    expect(result.time).toBeGreaterThanOrEqual(0)
  })

  it('响应纯文本（非 JSON content-type）', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('hello world'),
    }))

    const { proxyFetch } = await import('./proxy')
    const result = await proxyFetch('https://api.example.com/text')
    expect(result.body).toBe('hello world')
    expect(result.status).toBe(200)
  })

  it('JSON 解析失败时降级为 text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.reject(new Error('Invalid JSON')),
      text: () => Promise.resolve('not-json'),
    }))

    const { proxyFetch } = await import('./proxy')
    const result = await proxyFetch('https://api.example.com/broken')
    expect(result.body).toBe('not-json')
  })

  it('非 200 状态码', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('Not Found'),
    }))

    const { proxyFetch } = await import('./proxy')
    const result = await proxyFetch('https://api.example.com/missing')
    expect(result.status).toBe(404)
    expect(result.body).toBe('Not Found')
  })

  it('默认 GET 方法', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { proxyFetch } = await import('./proxy')
    await proxyFetch('https://api.example.com/get')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/proxy?target='),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('POST 方法带 body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ created: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { proxyFetch } = await import('./proxy')
    const result = await proxyFetch('https://api.example.com/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    })
    expect(result.status).toBe(201)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/proxy?target='),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'test' }) }),
    )
  })

  it('request headers 包含 X-Proxy-Target', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { proxyFetch } = await import('./proxy')
    await proxyFetch('https://api.example.com/data', { headers: { Authorization: 'Bearer token' } })
    const callArg = fetchMock.mock.calls[0][1]
    expect(callArg.headers['X-Proxy-Target']).toBe('https://api.example.com/data')
    expect(callArg.headers['Authorization']).toBe('Bearer token')
  })
})

describe('proxyFetch timeout (P0.3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('每次请求都传递 AbortSignal', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { proxyFetch } = await import('./proxy')
    await proxyFetch('https://api.example.com/data')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('POST 请求也携带 AbortSignal', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { proxyFetch } = await import('./proxy')
    await proxyFetch('https://api.example.com/create', { method: 'POST', body: '{}' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('接受自定义 timeoutMs 参数', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { proxyFetch } = await import('./proxy')
    await proxyFetch('https://api.example.com/data', { timeoutMs: 5000 })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('不传 timeoutMs 时仍传递 AbortSignal（使用默认 30s）', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { proxyFetch } = await import('./proxy')
    await proxyFetch('https://api.example.com/data', {})

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
})

describe('checkProxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('代理健康检查成功', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    }))

    const { checkProxy } = await import('./proxy')
    const result = await checkProxy()
    expect(result).toBe(true)
  })

  it('代理响应非 ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ status: 'error' }),
    }))

    const { checkProxy } = await import('./proxy')
    const result = await checkProxy()
    expect(result).toBe(false)
  })

  it('代理响应 status 非 ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'down' }),
    }))

    const { checkProxy } = await import('./proxy')
    const result = await checkProxy()
    expect(result).toBe(false)
  })

  it('fetch 抛出异常', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')))

    const { checkProxy } = await import('./proxy')
    const result = await checkProxy()
    expect(result).toBe(false)
  })
})

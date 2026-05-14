import { describe, it, expect, vi } from 'vitest'
import { isHttpRequest, isAssert } from './runner'
import type { CustomNode, CustomEdge, VarPort } from '../types/nodes'
import { proxyFetch } from './proxy'

vi.mock('./proxy', () => ({
  proxyFetch: vi.fn().mockResolvedValue({
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: { data: 'ok' },
    time: 100,
  }),
  checkProxy: vi.fn().mockResolvedValue(true),
}))

const base = { id: 'n1', position: { x: 0, y: 0 } }

function makeStartNode(id = 'start'): CustomNode {
  return {
    id,
    type: 'start',
    position: { x: 0, y: 0 },
    data: {
      label: '开始',
      type: 'start',
      out: [{ id: 'ok', label: 'ok', direction: 'out', type: 'boolean', isDefault: true }],
    },
  } as unknown as CustomNode
}

function makeHttpNode(id = '3'): CustomNode {
  return {
    id,
    type: 'httpRequest',
    position: { x: 200, y: 0 },
    data: {
      label: '接口',
      type: 'httpRequest',
      request: { url: 'https://example.com/api', method: 'GET', headers: {}, body: '' },
      in: [
        { id: 'execute', label: 'execute', direction: 'in', type: 'boolean', value: true, isDefault: true },
        { id: 'data', label: 'data', direction: 'in', type: 'object' },
        { id: 'headers', label: 'headers', direction: 'in', type: 'object' },
      ],
      out: [
        { id: 'status_code', label: 'status_code', direction: 'out', type: 'number' },
        { id: 'response_time', label: 'response_time', direction: 'out', type: 'number' },
        { id: 'response_body', label: 'response_body', direction: 'out', type: 'object' },
        { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', isDefault: true },
      ],
    },
  } as unknown as CustomNode
}

function makeEdge(source: string, target: string, sourcePort = 'ok', targetPort = 'execute'): CustomEdge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    sourceHandle: `var-out-${sourcePort}`,
    targetHandle: `var-in-${targetPort}`,
  }
}

describe('node type guards', () => {
  it('isHttpRequest recognizes httpRequest', () => {
    const n = { ...base, type: 'httpRequest', data: {} } as unknown as CustomNode
    expect(isHttpRequest(n)).toBe(true)
    expect(isAssert(n)).toBe(false)
  })

  it('isAssert recognizes assert', () => {
    const n = { ...base, type: 'assert', data: {} } as unknown as CustomNode
    expect(isHttpRequest(n)).toBe(false)
    expect(isAssert(n)).toBe(true)
  })

  it('start type is not httpRequest or assert', () => {
    const n = { ...base, type: 'start', data: { label: 'start', out: [] } } as unknown as CustomNode
    expect(isHttpRequest(n)).toBe(false)
    expect(isAssert(n)).toBe(false)
  })
})

describe('runWorkflow (P0.1 immutable nodes)', () => {
  it('does not mutate input nodes after execution', async () => {
    const start = makeStartNode()
    const http = makeHttpNode('3')
    const edges: CustomEdge[] = [makeEdge('start', '3')]

    const startOutOkBefore = start.data.out[0].value
    const httpInExecBefore = (http.data.in as VarPort[])[0].value
    const httpOutOkBefore = http.data.out[3].value

    const { runWorkflow } = await import('./runner')
    const callback = vi.fn()
    await runWorkflow([start, http], edges, callback)

    expect(start.data.out[0].value).toBe(startOutOkBefore)
    expect((http.data.in as VarPort[])[0].value).toBe(httpInExecBefore)
    expect(http.data.out[3].value).toBe(httpOutOkBefore)
  })

  it('returns correct port values while keeping input nodes unchanged', async () => {
    const start = makeStartNode()
    const http = makeHttpNode('3')
    const edges: CustomEdge[] = [makeEdge('start', '3')]

    const { runWorkflow } = await import('./runner')
    const callback = vi.fn()
    const result = await runWorkflow([start, http], edges, callback)

    expect(result['start']).toBeDefined()
    expect(result['start']['var-out-ok']).toBe(true)
    expect(result['3']).toBeDefined()
    expect(result['3']['var-out-ok']).toBe(true)

    expect(start.data.out[0].value).toBeUndefined()
    expect(http.data.out[3].value).toBeUndefined()
  })

  it('does not mutate input nodes when execute node has value set via input wiring', async () => {
    const start = makeStartNode()
    const http = makeHttpNode('3')
    start.data.out[0].value = 'should-not-leak'
    const edges: CustomEdge[] = [makeEdge('start', '3')]

    const { runWorkflow } = await import('./runner')
    await runWorkflow([start, http], edges, vi.fn())

    expect(start.data.out[0].value).toBe('should-not-leak')
  })
})

describe('runWorkflow (P0.2 optional sorted parameter)', () => {
  it('uses provided sorted parameter instead of re-sorting', async () => {
    const start = makeStartNode()
    const http = makeHttpNode('3')
    const edges: CustomEdge[] = [makeEdge('start', '3')]
    const manualSorted: CustomNode[] = [start, http]

    const topologyMod = await import('./topological')
    const sortSpy = vi.spyOn(topologyMod, 'topologicalSort')

    const { runWorkflow } = await import('./runner')
    await runWorkflow([start, http], edges, vi.fn(), undefined, manualSorted)

    expect(sortSpy).not.toHaveBeenCalled()
  })

  it('still calls topologicalSort when sorted is not provided', async () => {
    const start = makeStartNode()
    const http = makeHttpNode('3')
    const edges: CustomEdge[] = [makeEdge('start', '3')]

    const topologyMod = await import('./topological')
    const sortSpy = vi.spyOn(topologyMod, 'topologicalSort')

    const { runWorkflow } = await import('./runner')
    await runWorkflow([start, http], edges, vi.fn())

    expect(sortSpy).toHaveBeenCalled()
  })
})

describe('runWorkflow (P1.5 branch isolation)', () => {
  it('independent branch succeeds when another branch fails', async () => {
    const start = makeStartNode()
    const httpA = makeHttpNode('a')
    const httpB = makeHttpNode('b')
    const edges: CustomEdge[] = [
      makeEdge('start', 'a'),
      makeEdge('start', 'b'),
    ]

    vi.mocked(proxyFetch).mockRejectedValueOnce(new Error('A failed'))
    vi.mocked(proxyFetch).mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { data: 'b ok' },
      time: 50,
    })

    const { runWorkflow } = await import('./runner')
    const callback = vi.fn()
    const result = await runWorkflow([start, httpA, httpB], edges, callback)

    expect(result['a']['var-out-ok']).toBe(false)
    expect(result['b']['var-out-ok']).toBe(true)
  })

  it('downstream nodes of failed node are skipped', async () => {
    const start = makeStartNode()
    const httpA = makeHttpNode('a')
    const httpB = makeHttpNode('b')
    const edges: CustomEdge[] = [
      makeEdge('start', 'a'),
      makeEdge('a', 'b', 'ok', 'execute'),
    ]

    vi.mocked(proxyFetch).mockRejectedValueOnce(new Error('A failed'))

    const { runWorkflow } = await import('./runner')
    const callback = vi.fn()
    const result = await runWorkflow([start, httpA, httpB], edges, callback)

    expect(result['a']['var-out-ok']).toBe(false)
    expect(result['b']['var-out-ok']).toBe(false)

    const cCalls = callback.mock.calls.filter(([id]) => id === 'b')
    expect(cCalls.length).toBeGreaterThan(0)
    const hasErrorStatus = cCalls.some(([, status]) => status === 'error')
    expect(hasErrorStatus).toBe(true)
  })

  it('cascading failure: transitive dependency also skipped', async () => {
    const start = makeStartNode()
    const httpA = makeHttpNode('a')
    const httpB = makeHttpNode('b')
    const httpC = makeHttpNode('c')
    const edges: CustomEdge[] = [
      makeEdge('start', 'a'),
      makeEdge('a', 'b', 'ok', 'execute'),
      makeEdge('b', 'c', 'ok', 'execute'),
    ]

    vi.mocked(proxyFetch).mockRejectedValueOnce(new Error('A failed'))

    const { runWorkflow } = await import('./runner')
    const callback = vi.fn()
    const result = await runWorkflow([start, httpA, httpB, httpC], edges, callback)

    expect(result['a']['var-out-ok']).toBe(false)
    expect(result['b']['var-out-ok']).toBe(false)
    expect(result['c']['var-out-ok']).toBe(false)

    const bCalls = callback.mock.calls.filter(([id]) => id === 'b')
    expect(bCalls.some(([, s]) => s === 'error')).toBe(true)
    const cCalls = callback.mock.calls.filter(([id]) => id === 'c')
    expect(cCalls.some(([, s]) => s === 'error')).toBe(true)
  })

  it('data-dependent branch is skipped when upstream fails', async () => {
    const start = makeStartNode()
    const httpA = makeHttpNode('a')
    const httpB = makeHttpNode('b')
    const edges: CustomEdge[] = [
      makeEdge('start', 'a'),
      makeEdge('a', 'b', 'response_body', 'data'),
    ]

    vi.mocked(proxyFetch).mockRejectedValueOnce(new Error('A failed'))

    const { runWorkflow } = await import('./runner')
    const callback = vi.fn()
    const result = await runWorkflow([start, httpA, httpB], edges, callback)

    expect(result['a']['var-out-ok']).toBe(false)
    expect(result['b']['var-out-ok']).toBe(false)
  })

  it('all independent nodes complete when one fails', async () => {
    const start = makeStartNode()
    const httpA = makeHttpNode('a')
    const httpB = makeHttpNode('b')
    const httpC = makeHttpNode('c')
    const edges: CustomEdge[] = [
      makeEdge('start', 'a'),
      makeEdge('start', 'b'),
      makeEdge('start', 'c'),
    ]

    vi.mocked(proxyFetch).mockRejectedValueOnce(new Error('A failed'))

    const { runWorkflow } = await import('./runner')
    const callback = vi.fn()
    const result = await runWorkflow([start, httpA, httpB, httpC], edges, callback)

    expect(result['a']['var-out-ok']).toBe(false)
    expect(result['b']['var-out-ok']).toBe(true)
    expect(result['c']['var-out-ok']).toBe(true)
  })

  it('failed nodes have error info in callback', async () => {
    const start = makeStartNode()
    const httpA = makeHttpNode('a')
    const edges: CustomEdge[] = [makeEdge('start', 'a')]

    vi.mocked(proxyFetch).mockRejectedValueOnce(new Error('Network error'))

    const { runWorkflow } = await import('./runner')
    const callback = vi.fn()
    await runWorkflow([start, httpA], edges, callback)

    const errorCalls = callback.mock.calls.filter(([, status]) => status === 'error')
    expect(errorCalls.length).toBeGreaterThanOrEqual(1)
    const [, , data] = errorCalls[0]
    expect((data as Record<string, unknown>).error).toBeDefined()
  })
})

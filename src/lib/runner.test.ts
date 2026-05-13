import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isHttpRequest, isAssert, isExtract, runWorkflow } from './runner'
import type { CustomNode, CustomEdge, HttpRequestNodeData, AssertNodeData, ExtractNodeData } from '../types/nodes'

const base = { id: 'n1', position: { x: 0, y: 0 } }

const httpData: HttpRequestNodeData = {
  type: 'httpRequest', label: 'API',
  request: { url: 'https://test/api', method: 'GET', headers: {} },
  in: [],
  out: [{ id: 'ok', label: 'ok', direction: 'out', type: 'boolean' }],
}

const assertData: AssertNodeData = {
  type: 'assert', label: 'Check',
  assertions: [{ target: 'status_code', operator: 'equal', expected: '200' }],
  in: [],
  out: [{ id: 'ok', label: 'ok', direction: 'out', type: 'boolean' }],
}

const extractData: ExtractNodeData = {
  type: 'extract', label: 'Extract',
  rules: [{ name: 'id', path: '$.id' }],
  in: [],
  out: [{ id: 'ok', label: 'ok', direction: 'out', type: 'boolean' }],
}

describe('node type guards — 等价类', () => {
  it('isHttpRequest 正确识别', () => {
    const n: CustomNode = { ...base, type: 'httpRequest', data: httpData }
    expect(isHttpRequest(n)).toBe(true)
    expect(isAssert(n)).toBe(false)
    expect(isExtract(n)).toBe(false)
  })

  it('isAssert 正确识别', () => {
    const n: CustomNode = { ...base, type: 'assert', data: assertData }
    expect(isHttpRequest(n)).toBe(false)
    expect(isAssert(n)).toBe(true)
    expect(isExtract(n)).toBe(false)
  })

  it('isExtract 正确识别', () => {
    const n: CustomNode = { ...base, type: 'extract', data: extractData }
    expect(isHttpRequest(n)).toBe(false)
    expect(isAssert(n)).toBe(false)
    expect(isExtract(n)).toBe(true)
  })

  it('start 类型不属于任何特殊类型', () => {
    const n: CustomNode = { ...base, type: 'start', data: { label: '开始', out: [] } }
    expect(isHttpRequest(n)).toBe(false)
    expect(isAssert(n)).toBe(false)
    expect(isExtract(n)).toBe(false)
  })
})

function makeStartNode(id: string, out: CustomNode['data']['out'] = []): CustomNode {
  return { id, type: 'start', position: { x: 0, y: 0 }, data: { label: id, out } }
}

describe('runWorkflow — 场景', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('空工作流返回空结果', async () => {
    const cb = vi.fn()
    const result = await runWorkflow([], [], cb)
    expect(result).toEqual({})
    expect(cb).not.toHaveBeenCalled()
  })

  it('单个 start 节点执行成功', async () => {
    const nodes = [makeStartNode('start', [
      { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: true },
    ])]
    const cb = vi.fn()
    const result = await runWorkflow(nodes, [], cb)
    expect(cb).toHaveBeenCalledWith('start', 'running')
    expect(cb).toHaveBeenCalledWith('start', 'success', expect.anything())
    expect(result.start['var-out-ok']).toBe(true)
  })

  it('stopAt 在指定节点前停止', async () => {
    const nodes = [
      makeStartNode('start', [
        { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: true },
      ]),
      { id: 'http', type: 'httpRequest', position: { x: 200, y: 0 }, data: { ...httpData, in: [{ id: 'execute', label: 'execute', direction: 'in', type: 'boolean', isDefault: true }] } },
    ]
    const edges: CustomEdge[] = [
      { id: 'e1', source: 'start', target: 'http', sourceHandle: 'var-out-ok', targetHandle: 'var-in-execute' },
    ]
    const cb = vi.fn()
    await runWorkflow(nodes, edges, cb, 'start')
    expect(cb).not.toHaveBeenCalled()
  })

  it('start 节点始终输出 ok=true', async () => {
    const nodes = [makeStartNode('start', [
      { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: false },
    ])]
    const cb = vi.fn()
    const result = await runWorkflow(nodes, [], cb)
    expect(cb).toHaveBeenCalledWith('start', 'success', expect.anything())
    expect(result.start['var-out-ok']).toBe(true)
  })

  it('start 无 execute 边 → 直接执行', async () => {
    const nodes = [makeStartNode('start', [
      { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: true },
    ])]
    const cb = vi.fn()
    await runWorkflow(nodes, [], cb)
    expect(cb).toHaveBeenCalledWith('start', 'running')
    expect(cb).toHaveBeenCalledWith('start', 'success', expect.anything())
  })

  it('start 自定义输出端口传递值', async () => {
    const nodes = [makeStartNode('start', [
      { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: true },
      { id: 'name', label: '姓名', direction: 'out', type: 'string', value: 'Alice' },
    ])]
    const cb = vi.fn()
    const result = await runWorkflow(nodes, [], cb)
    expect(result.start['var-out-ok']).toBe(true)
    expect(result.start['var-out-name']).toBe('Alice')
  })

  it('start 连接下游节点，下游正常执行', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ data: 'ok' }),
    }))

    const nodes = [
      makeStartNode('start', [
        { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: true },
      ]),
      {
        id: 'http',
        type: 'httpRequest',
        position: { x: 200, y: 0 },
        data: {
          ...httpData,
          request: { url: 'https://test/api', method: 'GET', headers: {} },
          in: [{ id: 'execute', label: 'execute', direction: 'in', type: 'boolean', isDefault: true }],
        },
      },
    ]
    const edges: CustomEdge[] = [
      { id: 'e1', source: 'start', target: 'http', sourceHandle: 'var-out-ok', targetHandle: 'var-in-execute' },
    ]
    const cb = vi.fn()
    await runWorkflow(nodes, edges, cb)
    expect(cb).toHaveBeenCalledWith('http', 'running')
  })

  it('HTTP 节点失败 → 工作流中断，下游不执行', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network Error')))

    const nodes = [
      makeStartNode('start', [
        { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: true },
      ]),
      {
        id: 'http',
        type: 'httpRequest',
        position: { x: 200, y: 0 },
        data: {
          ...httpData,
          request: { url: 'https://bad.url', method: 'GET', headers: {} },
          in: [{ id: 'execute', label: 'execute', direction: 'in', type: 'boolean', isDefault: true }],
        },
      },
      { ...base, id: 'after', type: 'start', data: { label: 'after', out: [] } },
    ]
    const edges: CustomEdge[] = [
      { id: 'e1', source: 'start', target: 'http', sourceHandle: 'var-out-ok', targetHandle: 'var-in-execute' },
      { id: 'e2', source: 'http', target: 'after', sourceHandle: 'var-out-ok', targetHandle: 'var-in-execute' },
    ]
    const cb = vi.fn()
    await runWorkflow(nodes, edges, cb)
    expect(cb).toHaveBeenCalledWith('start', 'running')
    expect(cb).toHaveBeenCalledWith('http', 'running')
    expect(cb).toHaveBeenCalledWith('http', 'error', expect.anything())
    expect(cb).not.toHaveBeenCalledWith('after', 'running')
  })
})

describe('runWorkflow — execute port 因果', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('无 execute 边 → 直接执行 (C1=false)', async () => {
    const nodes = [makeStartNode('start', [
      { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: true },
    ])]
    const cb = vi.fn()
    await runWorkflow(nodes, [], cb)
    expect(cb).toHaveBeenCalledWith('start', 'running')
    expect(cb).toHaveBeenCalledWith('start', 'success', expect.anything())
  })

  it('有 execute 边且值为 true → 下游执行 (C1=true, C2=true, C3=true)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ data: 'ok' }),
    }))

    const nodes = [
      makeStartNode('start', [
        { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: true },
      ]),
      {
        id: 'http',
        type: 'httpRequest',
        position: { x: 200, y: 0 },
        data: {
          ...httpData,
          request: { url: 'https://test/api', method: 'GET', headers: {} },
          in: [{ id: 'execute', label: 'execute', direction: 'in', type: 'boolean', isDefault: true }],
        },
      },
    ]
    const edges: CustomEdge[] = [
      { id: 'e1', source: 'start', target: 'http', sourceHandle: 'var-out-ok', targetHandle: 'var-in-execute' },
    ]
    const cb = vi.fn()
    await runWorkflow(nodes, edges, cb)
    expect(cb).toHaveBeenCalledWith('start', 'running')
    expect(cb).toHaveBeenCalledWith('http', 'running')
    expect(cb).toHaveBeenCalledWith('http', 'success', expect.anything())
  })

  it('execute 值为 1（数字）也视为 true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    }))

    const nodes = [
      {
        id: 's1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          ...httpData,
          request: { url: 'https://test/api', method: 'GET', headers: {} },
          out: [
            { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: 1 },
            { id: 'status_code', label: 'status_code', direction: 'out', type: 'number' },
            { id: 'response_time', label: 'response_time', direction: 'out', type: 'number' },
            { id: 'response_body', label: 'response_body', direction: 'out', type: 'object' },
          ],
        },
      },
      {
        id: 's2',
        type: 'httpRequest',
        position: { x: 200, y: 0 },
        data: {
          ...httpData,
          request: { url: 'https://test/api2', method: 'GET', headers: {} },
          in: [{ id: 'execute', label: 'execute', direction: 'in', type: 'boolean', isDefault: true }],
        },
      },
    ]
    const edges: CustomEdge[] = [
      { id: 'e1', source: 's1', target: 's2', sourceHandle: 'var-out-ok', targetHandle: 'var-in-execute' },
    ]
    const cb = vi.fn()
    await runWorkflow(nodes, edges, cb)
    expect(cb).toHaveBeenCalledWith('s1', 'running')
    expect(cb).toHaveBeenCalledWith('s2', 'running')
  })
})

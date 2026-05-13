import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isHttpRequest, isAssert, runWorkflow } from './runner'
import type { CustomNode, CustomEdge, HttpRequestNodeData, AssertNodeData } from '../types/nodes'

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

describe('node type guards', () => {
  it('isHttpRequest recognizes httpRequest', () => {
    const n: CustomNode = { ...base, type: 'httpRequest', data: httpData }
    expect(isHttpRequest(n)).toBe(true)
    expect(isAssert(n)).toBe(false)
  })

  it('isAssert recognizes assert', () => {
    const n: CustomNode = { ...base, type: 'assert', data: assertData }
    expect(isHttpRequest(n)).toBe(false)
    expect(isAssert(n)).toBe(true)
  })

  it('start type is not httpRequest or assert', () => {
    const n: CustomNode = { ...base, type: 'start', data: { label: 'start', out: [] } }
    expect(isHttpRequest(n)).toBe(false)
    expect(isAssert(n)).toBe(false)
  })
})

function makeStartNode(id: string, out: CustomNode['data']['out'] = []): CustomNode {
  return { id, type: 'start', position: { x: 0, y: 0 }, data: { label: id, out } }
}

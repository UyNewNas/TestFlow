import { describe, it, expect } from 'vitest'
import { validateConnection } from './validateEdges'
import type { Connection, Edge } from '@xyflow/react'

function conn(overrides: Partial<Connection> = {}): Connection {
  return { source: 'n1', target: 'n2', sourceHandle: 'var-out-ok', targetHandle: 'var-in-execute', ...overrides }
}

function edge(id: string, source: string, target: string, sourceHandle: string, targetHandle: string): Edge {
  return { id, source, target, sourceHandle, targetHandle }
}

describe('validateConnection — 决策表', () => {
  it('完整有效新连线 → valid', () => {
    const r = validateConnection(conn(), [])
    expect(r.valid).toBe(true)
    expect(r.replaceEdgeId).toBeUndefined()
  })

  it('缺少 source → invalid', () => {
    expect(validateConnection(conn({ source: '' }), []).valid).toBe(false)
    expect(validateConnection(conn({ source: undefined as unknown as string }), []).valid).toBe(false)
  })

  it('缺少 target → invalid', () => {
    expect(validateConnection(conn({ target: '' }), []).valid).toBe(false)
    expect(validateConnection(conn({ target: undefined as unknown as string }), []).valid).toBe(false)
  })

  it('自连接 → invalid', () => {
    expect(validateConnection(conn({ source: 'n1', target: 'n1' }), []).valid).toBe(false)
  })

  it('缺少 sourceHandle → invalid', () => {
    expect(validateConnection(conn({ sourceHandle: '' }), []).valid).toBe(false)
    expect(validateConnection(conn({ sourceHandle: undefined as unknown as string }), []).valid).toBe(false)
  })

  it('缺少 targetHandle → invalid', () => {
    expect(validateConnection(conn({ targetHandle: '' }), []).valid).toBe(false)
    expect(validateConnection(conn({ targetHandle: undefined as unknown as string }), []).valid).toBe(false)
  })

  it('无效端口 ID → invalid', () => {
    expect(validateConnection(conn({ sourceHandle: 'out-ok' }), []).valid).toBe(false)
    expect(validateConnection(conn({ targetHandle: 'in-execute' }), []).valid).toBe(false)
  })

  it('重复连线 → invalid', () => {
    const existing = [edge('e1', 'n1', 'n2', 'var-out-ok', 'var-in-execute')]
    const r = validateConnection(conn(), existing)
    expect(r.valid).toBe(false)
  })

  it('目标端口已被其他连线占用 → valid + replaceEdgeId', () => {
    const existing = [edge('e1', 'n0', 'n2', 'var-out-ok', 'var-in-execute')]
    const r = validateConnection(conn(), existing)
    expect(r.valid).toBe(true)
    expect(r.replaceEdgeId).toBe('e1')
  })

  it('目标端口相同但 sourceHandle 不同 → valid + replaceEdgeId', () => {
    const existing = [edge('e1', 'n0', 'n2', 'var-out-status_code', 'var-in-execute')]
    const r = validateConnection(conn(), existing)
    expect(r.valid).toBe(true)
    expect(r.replaceEdgeId).toBe('e1')
  })

  it('多个已有连线中只匹配目标端口的那条', () => {
    const existing = [
      edge('e1', 'n0', 'n3', 'var-out-ok', 'var-in-execute'),
      edge('e2', 'nx', 'n2', 'var-out-ok', 'var-in-execute'),
      edge('e3', 'n0', 'n2', 'var-out-ok', 'var-in-status_code'),
    ]
    const r = validateConnection(conn(), existing)
    expect(r.valid).toBe(true)
    expect(r.replaceEdgeId).toBe('e2')
  })
})

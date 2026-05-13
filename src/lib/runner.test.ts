import { describe, it, expect } from 'vitest'
import { isHttpRequest, isAssert } from './runner'
import type { CustomNode } from '../types/nodes'

const base = { id: 'n1', position: { x: 0, y: 0 } }

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

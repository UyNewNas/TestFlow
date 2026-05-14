import { describe, it, expect, vi } from 'vitest'
import { newPortId, uniqueName } from './portUtils'
import type { VarPort } from '../types/nodes'

describe('newPortId', () => {
  it('generates an id with the given prefix', () => {
    const existing: VarPort[] = []
    const id = newPortId('data', existing)
    expect(id.startsWith('data_')).toBe(true)
  })

  it('generates unique ids on successive calls', () => {
    const existing: VarPort[] = []
    const id1 = newPortId('param', existing)
    const id2 = newPortId('param', existing)
    expect(id1).not.toBe(id2)
  })

  it('avoids collision with existing ids', () => {
    const existing: VarPort[] = [
      { id: 'data_abc', label: 'a', direction: 'in', type: 'string' },
    ]
    const mockNow = 1234567890
    vi.spyOn(Date, 'now').mockReturnValue(mockNow)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const id = newPortId('data', existing)
    expect(id.startsWith('data_')).toBe(true)
    expect(id).toBe(`data_${mockNow}_`)
  })
})

describe('uniqueName', () => {
  it('returns base name when unique', () => {
    const existing: VarPort[] = [{ id: 'a', label: 'status', direction: 'out', type: 'number' }]
    expect(uniqueName('body', existing)).toBe('body')
  })

  it('returns base_2 when base already exists', () => {
    const existing: VarPort[] = [{ id: 'a', label: 'body', direction: 'out', type: 'string' }]
    expect(uniqueName('body', existing)).toBe('body_2')
  })

  it('returns base_3 when base and base_2 exist', () => {
    const existing: VarPort[] = [
      { id: 'a', label: 'body', direction: 'out', type: 'string' },
      { id: 'b', label: 'body_2', direction: 'out', type: 'string' },
    ]
    expect(uniqueName('body', existing)).toBe('body_3')
  })

  it('returns base_4 when base, base_2, base_3 exist', () => {
    const existing: VarPort[] = [
      { id: 'a', label: 'body', direction: 'out', type: 'string' },
      { id: 'b', label: 'body_2', direction: 'out', type: 'string' },
      { id: 'c', label: 'body_3', direction: 'out', type: 'string' },
    ]
    expect(uniqueName('body', existing)).toBe('body_4')
  })

  it('handles empty existing array', () => {
    const existing: VarPort[] = []
    expect(uniqueName('new_field', existing)).toBe('new_field')
  })
})

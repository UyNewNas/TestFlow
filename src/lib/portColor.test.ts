import { describe, it, expect } from 'vitest'
import { portColor } from './portColor'
import type { VarPort } from '../types/nodes'

describe('portColor', () => {
  it('execute port returns green when value is true', () => {
    const p: VarPort = { id: 'execute', label: 'execute', direction: 'in', type: 'boolean', value: true }
    expect(portColor(p)).toBe('#06d6a0')
  })

  it('execute port returns undefined when value is false', () => {
    const p: VarPort = { id: 'execute', label: 'execute', direction: 'in', type: 'boolean', value: false }
    expect(portColor(p)).toBeUndefined()
  })

  it('execute port returns undefined when value is undefined', () => {
    const p: VarPort = { id: 'execute', label: 'execute', direction: 'in', type: 'boolean' }
    expect(portColor(p)).toBeUndefined()
  })

  it('ok port returns green when value is true', () => {
    const p: VarPort = { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: true }
    expect(portColor(p)).toBe('#06d6a0')
  })

  it('ok port returns red when value is false', () => {
    const p: VarPort = { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value: false }
    expect(portColor(p)).toBe('#ef476f')
  })

  it('ok port returns undefined when value is undefined', () => {
    const p: VarPort = { id: 'ok', label: 'ok', direction: 'out', type: 'boolean' }
    expect(portColor(p)).toBeUndefined()
  })

  it('other port returns green when value is defined', () => {
    const p: VarPort = { id: 'status_code', label: 'status_code', direction: 'out', type: 'number', value: 200 }
    expect(portColor(p)).toBe('#06d6a0')
  })

  it('other port returns green when value is 0 (falsy but defined)', () => {
    const p: VarPort = { id: 'count', label: 'count', direction: 'out', type: 'number', value: 0 }
    expect(portColor(p)).toBe('#06d6a0')
  })

  it('other port returns green when value is empty string', () => {
    const p: VarPort = { id: 'body', label: 'body', direction: 'out', type: 'string', value: '' }
    expect(portColor(p)).toBe('#06d6a0')
  })

  it('other port returns undefined when value is undefined', () => {
    const p: VarPort = { id: 'response_time', label: 'response_time', direction: 'out', type: 'number' }
    expect(portColor(p)).toBeUndefined()
  })

  it('other port returns green when value is false (truthy check, not ok/execute)', () => {
    const p: VarPort = { id: 'custom', label: 'custom', direction: 'out', type: 'boolean', value: false }
    expect(portColor(p)).toBe('#06d6a0')
  })
})

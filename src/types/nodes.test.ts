import { describe, it, expect } from 'vitest'
import { portIdFromHandle, inPortId, outPortId } from './nodes'

describe('inPortId', () => {
  it('将端口 ID 包装为 var-in- 前缀', () => {
    expect(inPortId('execute')).toBe('var-in-execute')
  })

  it('空字符串', () => {
    expect(inPortId('')).toBe('var-in-')
  })
})

describe('outPortId', () => {
  it('将端口 ID 包装为 var-out- 前缀', () => {
    expect(outPortId('ok')).toBe('var-out-ok')
  })

  it('空字符串', () => {
    expect(outPortId('')).toBe('var-out-')
  })
})

describe('portIdFromHandle — 等价类', () => {
  it('var-in- 前缀提取 ID', () => {
    expect(portIdFromHandle('var-in-status_code')).toBe('status_code')
    expect(portIdFromHandle('var-in-execute')).toBe('execute')
  })

  it('var-out- 前缀提取 ID', () => {
    expect(portIdFromHandle('var-out-ok')).toBe('ok')
    expect(portIdFromHandle('var-out-response_body')).toBe('response_body')
  })

  it('无 var- 前缀返回 null', () => {
    expect(portIdFromHandle('in-status_code')).toBeNull()
    expect(portIdFromHandle('execute')).toBeNull()
    expect(portIdFromHandle('some-random-string')).toBeNull()
  })

  it('空字符串返回 null', () => {
    expect(portIdFromHandle('')).toBeNull()
  })

  it('仅 var-in- 无 ID', () => {
    expect(portIdFromHandle('var-in-')).toBe('')
  })

  it('仅 var-out- 无 ID', () => {
    expect(portIdFromHandle('var-out-')).toBe('')
  })
})

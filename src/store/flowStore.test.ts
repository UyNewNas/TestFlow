import { describe, it, expect, beforeEach } from 'vitest'
import { getFlowStore } from './flowStore'

describe('flowStore', () => {
  beforeEach(() => {
    getFlowStore().clearPortValues()
    getFlowStore().resetAllStatuses()
    getFlowStore().setProxyOnline(true)
    getFlowStore().setSelectedNodeId(null)
  })

  describe('proxyOnline', () => {
    it('设置为 true', () => {
      getFlowStore().setProxyOnline(true)
      expect(getFlowStore().getState().proxyOnline).toBe(true)
    })

    it('设置为 false', () => {
      getFlowStore().setProxyOnline(false)
      expect(getFlowStore().getState().proxyOnline).toBe(false)
    })

    it('true → false', () => {
      getFlowStore().setProxyOnline(true)
      getFlowStore().setProxyOnline(false)
      expect(getFlowStore().getState().proxyOnline).toBe(false)
    })

    it('false → true', () => {
      getFlowStore().setProxyOnline(false)
      getFlowStore().setProxyOnline(true)
      expect(getFlowStore().getState().proxyOnline).toBe(true)
    })
  })

  describe('selectedNodeId', () => {
    it('设置为 "n1"', () => {
      getFlowStore().setSelectedNodeId('n1')
      expect(getFlowStore().getState().selectedNodeId).toBe('n1')
    })

    it('"n1" → "n2"', () => {
      getFlowStore().setSelectedNodeId('n1')
      getFlowStore().setSelectedNodeId('n2')
      expect(getFlowStore().getState().selectedNodeId).toBe('n2')
    })

    it('"n1" → null', () => {
      getFlowStore().setSelectedNodeId('n1')
      getFlowStore().setSelectedNodeId(null)
      expect(getFlowStore().getState().selectedNodeId).toBeNull()
    })
  })

  describe('portValues', () => {
    it('设置并读取端口值', () => {
      getFlowStore().setPortValue('n1', 'status_code', 200)
      expect(getFlowStore().getPortValue('n1', 'status_code')).toBe(200)
    })

    it('覆盖更新', () => {
      getFlowStore().setPortValue('n1', 'status_code', 200)
      getFlowStore().setPortValue('n1', 'status_code', 404)
      expect(getFlowStore().getPortValue('n1', 'status_code')).toBe(404)
    })

    it('批量设置', () => {
      getFlowStore().setPortValues('n1', { status_code: 200, response_time: 150 })
      expect(getFlowStore().getPortValue('n1', 'status_code')).toBe(200)
      expect(getFlowStore().getPortValue('n1', 'response_time')).toBe(150)
    })

    it('批量设置与已有值合并', () => {
      getFlowStore().setPortValue('n1', 'status_code', 200)
      getFlowStore().setPortValues('n1', { response_time: 150 })
      expect(getFlowStore().getPortValue('n1', 'status_code')).toBe(200)
      expect(getFlowStore().getPortValue('n1', 'response_time')).toBe(150)
    })

    it('clearPortValues 清空所有', () => {
      getFlowStore().setPortValue('n1', 'ok', true)
      getFlowStore().setPortValue('n2', 'status_code', 200)
      getFlowStore().clearPortValues()
      expect(getFlowStore().getPortValue('n1', 'ok')).toBeUndefined()
      expect(getFlowStore().getPortValue('n2', 'status_code')).toBeUndefined()
    })

    it('读取不存在的端口', () => {
      expect(getFlowStore().getPortValue('n1', 'nonexistent')).toBeUndefined()
    })

    it('多节点隔离', () => {
      getFlowStore().setPortValue('n1', 'ok', true)
      getFlowStore().setPortValue('n2', 'ok', false)
      expect(getFlowStore().getPortValue('n1', 'ok')).toBe(true)
      expect(getFlowStore().getPortValue('n2', 'ok')).toBe(false)
    })
  })

  describe('nodeStatuses', () => {
    it('设置 running 然后 success', () => {
      getFlowStore().setNodeStatus('n1', 'running')
      expect(getFlowStore().getState().nodeStatuses['n1']).toBe('running')
      getFlowStore().setNodeStatus('n1', 'success')
      expect(getFlowStore().getState().nodeStatuses['n1']).toBe('success')
    })

    it('设置 running 然后 error', () => {
      getFlowStore().setNodeStatus('n1', 'running')
      getFlowStore().setNodeStatus('n1', 'error')
      expect(getFlowStore().getState().nodeStatuses['n1']).toBe('error')
    })

    it('resetAllStatuses', () => {
      getFlowStore().setNodeStatus('n1', 'success')
      getFlowStore().setNodeStatus('n2', 'error')
      getFlowStore().resetAllStatuses()
      expect(getFlowStore().getState().nodeStatuses).toEqual({})
    })
  })
})

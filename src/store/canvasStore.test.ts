import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import { getCanvasStore, type CanvasData } from './canvasStore'

function clearLocalStorage() {
  localStorage.clear()
}

describe('canvasStore', () => {
  beforeEach(() => {
    clearLocalStorage()
    vi.restoreAllMocks()
  })

  describe('初始状态', () => {
    it('localStorage 为空时存在默认画布', () => {
      const store = getCanvasStore()
      const canvases = store.getAllCanvases()
      expect(canvases.length).toBeGreaterThanOrEqual(1)
      expect(canvases.some(c => c.name === '画布 1')).toBe(true)
    })

    it('activeCanvasId 指向存在的画布', () => {
      const store = getCanvasStore()
      const activeId = store.getState().activeCanvasId
      expect(store.getAllCanvases().some(c => c.id === activeId)).toBe(true)
    })
  })

  describe('addCanvas', () => {
    it('添加新画布后数量增加', () => {
      const store = getCanvasStore()
      const before = store.getAllCanvases().length
      const id = store.addCanvas('新画布')
      expect(id).toMatch(/^canvas-\d+-1$/)
      expect(store.getAllCanvases()).toHaveLength(before + 1)
    })

    it('新增画布有正确的初始数据', () => {
      const store = getCanvasStore()
      const id = store.addCanvas('测试画布')
      const canvas = store.getAllCanvases().find(c => c.id === id)
      expect(canvas).toBeDefined()
      expect(canvas!.name).toBe('测试画布')
      expect(canvas!.nodes).toEqual([])
      expect(canvas!.edges).toEqual([])
    })
  })

  describe('switchCanvas', () => {
    it('切换到存在的画布', () => {
      const store = getCanvasStore()
      const id2 = store.addCanvas('画布2')
      store.switchCanvas(id2)
      expect(store.getState().activeCanvasId).toBe(id2)
    })

    it('切换到不存在的画布不改变 activeCanvasId', () => {
      const store = getCanvasStore()
      const before = store.getState().activeCanvasId
      store.switchCanvas('nonexistent-id')
      expect(store.getState().activeCanvasId).toBe(before)
    })
  })

  describe('removeCanvas', () => {
    it('删除后画布不存在于列表中', () => {
      const store = getCanvasStore()
      const id = store.addCanvas('待删除')
      const before = store.getAllCanvases().length
      store.removeCanvas(id)
      expect(store.getAllCanvases()).toHaveLength(before - 1)
      expect(store.getAllCanvases().find(c => c.id === id)).toBeUndefined()
    })

    it('删除激活画布时自动切换到其他画布', () => {
      const store = getCanvasStore()
      const id = store.addCanvas('待删除激活')
      store.switchCanvas(id)
      const beforeCount = store.getAllCanvases().length
      store.removeCanvas(id)
      expect(store.getAllCanvases()).toHaveLength(beforeCount - 1)
      expect(store.getState().activeCanvasId).not.toBe(id)
    })

    it('只剩一个画布时不允许删除', () => {
      const store = getCanvasStore()
      const allBefore = [...store.getAllCanvases()]
      for (const c of allBefore.slice(1)) {
        store.removeCanvas(c.id)
      }
      const before = store.getAllCanvases()
      if (before.length !== 1) return
      store.removeCanvas(before[0].id)
      expect(store.getAllCanvases()).toHaveLength(1)
    })
  })

  describe('saveCanvasData', () => {
    it('保存后画布数据已更新', () => {
      const store = getCanvasStore()
      const id = store.addCanvas('数据画布')
      const nodes = [{ id: 'n1', type: 'start', position: { x: 0, y: 0 }, data: { label: '开始' } }]
      const edges = [{ id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'out', targetHandle: 'in' }]
      store.saveCanvasData(id, nodes as unknown as Node[], edges as unknown as Edge[])
      const canvas = store.getAllCanvases().find(c => c.id === id)
      expect(canvas).toBeDefined()
      expect(canvas!.nodes).toHaveLength(1)
      expect(canvas!.edges).toHaveLength(1)
    })

    it('只更新匹配的画布不影响其他', () => {
      const store = getCanvasStore()
      const id1 = store.addCanvas('画布A')
      const id2 = store.addCanvas('画布B')
      expect(id1).not.toBe(id2)
      store.saveCanvasData(id2, [{ id: 'x', type: 'start', position: { x: 0, y: 0 }, data: {} }] as unknown as Node[], [])
      const c1 = store.getAllCanvases().find(c => c.id === id1)
      expect(c1).toBeDefined()
      expect(c1!.nodes).toEqual([])
      const c2 = store.getAllCanvases().find(c => c.id === id2)
      expect(c2).toBeDefined()
      expect(c2!.nodes).toHaveLength(1)
      expect(c2!.nodes[0].id).toBe('x')
    })
  })

  describe('getActiveCanvas', () => {
    it('返回当前激活的画布', () => {
      const store = getCanvasStore()
      const activeId = store.getState().activeCanvasId
      const canvas = store.getActiveCanvas()
      expect(canvas.id).toBe(activeId)
    })
  })

  describe('importCanvas', () => {
    it('导入新 ID 的画布后数量增加', () => {
      const store = getCanvasStore()
      const before = store.getAllCanvases().length
      const imported: CanvasData = { id: 'external-1', name: '外部画布', nodes: [], edges: [] }
      const newId = store.importCanvas(imported)
      expect(newId).toBe('external-1')
      expect(store.getAllCanvases()).toHaveLength(before + 1)
    })

    it('导入重复 ID 时自动生成新 ID 并追加 (导入) 后缀', () => {
      const store = getCanvasStore()
      const imported: CanvasData = { id: 'canvas-1', name: '外部画布', nodes: [], edges: [] }
      const newId = store.importCanvas(imported)
      expect(newId).toMatch(/^canvas-\d+-\d+$/)
      expect(newId).not.toBe('canvas-1')
      const importedCanvas = store.getAllCanvases().find(c => c.id === newId)
      expect(importedCanvas).toBeDefined()
      expect(importedCanvas!.name).toBe('外部画布 (导入)')
    })
  })
})

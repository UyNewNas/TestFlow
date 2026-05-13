import { describe, it, expect, beforeEach } from 'vitest'
import { syncNodeCounter, getNodeCounter } from './lib/nodeCounter'
import { getCanvasStore } from './store/canvasStore'
import type { Node } from '@xyflow/react'

function makeNode(id: string, type = 'httpRequest'): Node {
  return {
    id,
    type,
    position: { x: 100, y: 100 },
    data: { label: 'test', type },
  }
}

describe('syncNodeCounter', () => {
  it('空数组时重置为 3', () => {
    syncNodeCounter([])
    expect(getNodeCounter()).toBe(3)
  })

  it('有节点时设置为 maxId + 1', () => {
    const nodes: Node[] = [
      makeNode('3'),
      makeNode('5'),
      makeNode('10'),
    ]
    syncNodeCounter(nodes)
    expect(getNodeCounter()).toBe(11)
  })

  it('忽略非数字 ID（如 start）', () => {
    const nodes: Node[] = [
      makeNode('start', 'start'),
      makeNode('7'),
    ]
    syncNodeCounter(nodes)
    expect(getNodeCounter()).toBe(8)
  })

  it('只有非数字 ID 时降级为 maxId=2，计数重置为 3', () => {
    const nodes: Node[] = [
      makeNode('start', 'start'),
      makeNode('abc'),
    ]
    syncNodeCounter(nodes)
    expect(getNodeCounter()).toBe(3)
  })

  it('连续添加节点时 counter 递增不重复', () => {
    syncNodeCounter([])
    expect(getNodeCounter()).toBe(3)
    const nodesAfterAdd: Node[] = [
      makeNode('start', 'start'),
      makeNode('3'),
      makeNode('4'),
    ]
    syncNodeCounter(nodesAfterAdd)
    expect(getNodeCounter()).toBe(5)
  })
})

describe('canvasStore - 新增画布后 App 层行为', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('新增画布初始 nodes 为空数组', () => {
    const store = getCanvasStore()
    const id = store.addCanvas('新画布')
    store.switchCanvas(id)

    const canvas = store.getAllCanvases().find((c) => c.id === id)
    expect(canvas).toBeDefined()
    expect(canvas!.name).toBe('新画布')
    expect(canvas!.nodes).toEqual([])
  })

  it('画布有节点时保留原有节点', () => {
    const store = getCanvasStore()
    const id = store.addCanvas('有节点画布')
    const nodes = [
      makeNode('start', 'start'),
      makeNode('3'),
      makeNode('4'),
    ]
    store.saveCanvasData(id, nodes, [])
    store.switchCanvas(id)

    const canvas = store.getAllCanvases().find((c) => c.id === id)
    expect(canvas).toBeDefined()
    expect(canvas!.nodes).toHaveLength(3)
    expect(canvas!.nodes.map((n) => n.id)).toEqual(['start', '3', '4'])
  })

  it('App 层保存空画布后补充开始节点，保存应生效', () => {
    const store = getCanvasStore()
    const id = store.addCanvas('空画布')

    const startNode = makeNode('start', 'start')
    store.saveCanvasData(id, [startNode], [])

    const canvas = store.getAllCanvases().find((c) => c.id === id)
    expect(canvas).toBeDefined()
    expect(canvas!.nodes).toHaveLength(1)
    expect(canvas!.nodes[0].id).toBe('start')
  })

  it('从一个有节点的画布切换到新建空画布不会丢失原有画布数据', () => {
    const store = getCanvasStore()
    const id1 = store.addCanvas('源画布')
    const originalNodes = [makeNode('start', 'start'), makeNode('3'), makeNode('4')]
    store.saveCanvasData(id1, originalNodes, [])

    const id2 = store.addCanvas('空画布')

    store.switchCanvas(id1)
    const canvas1 = store.getAllCanvases().find((c) => c.id === id1)
    expect(canvas1!.nodes).toHaveLength(3)

    store.switchCanvas(id2)
    const canvas2After = store.getAllCanvases().find((c) => c.id === id1)
    expect(canvas2After!.nodes).toHaveLength(3)
  })
})

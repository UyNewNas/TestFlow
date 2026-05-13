import { describe, it, expect } from 'vitest'
import { topologicalSort } from './topological'
import type { CustomNode, CustomEdge } from '../types/nodes'

function node(id: string, overrides: Partial<CustomNode['data']> = {}): CustomNode {
  return {
    id,
    type: 'start',
    position: { x: 0, y: 0 },
    data: { label: id, out: [], ...overrides },
  } as CustomNode
}

function edge(id: string, source: string, target: string, sourceHandle = 'var-out-ok', targetHandle = 'var-in-execute'): CustomEdge {
  return { id, source, target, sourceHandle, targetHandle }
}

describe('topologicalSort — 边界值', () => {
  it('空节点列表', () => {
    expect(topologicalSort([], [])).toEqual([])
  })

  it('单个节点', () => {
    const result = topologicalSort([node('a')], [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })

  it('两个节点线性依赖', () => {
    const nodes = [node('a'), node('b')]
    const edges = [edge('e1', 'a', 'b')]
    const result = topologicalSort(nodes, edges)
    expect(result.map(n => n.id)).toEqual(['a', 'b'])
  })
})

describe('topologicalSort — 决策表', () => {
  it('多个节点线性链', () => {
    const nodes = [node('a'), node('b'), node('c'), node('d')]
    const edges = [
      edge('e1', 'a', 'b'),
      edge('e2', 'b', 'c'),
      edge('e3', 'c', 'd'),
    ]
    const result = topologicalSort(nodes, edges)
    expect(result.map(n => n.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('分支拓扑 (DAG)', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges = [
      edge('e1', 'a', 'b'),
      edge('e2', 'a', 'c'),
    ]
    const result = topologicalSort(nodes, edges)
    expect(result[0].id).toBe('a')
    expect(result.map(n => n.id)).toContain('b')
    expect(result.map(n => n.id)).toContain('c')
    expect(result.map(n => n.id).indexOf('b')).toBeGreaterThan(0)
    expect(result.map(n => n.id).indexOf('c')).toBeGreaterThan(0)
  })

  it('汇聚拓扑 (多源到单一目标)', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges = [
      edge('e1', 'a', 'c'),
      edge('e2', 'b', 'c'),
    ]
    const result = topologicalSort(nodes, edges)
    expect(result[result.length - 1].id).toBe('c')
  })

  it('孤立节点出现在结果中', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges = [edge('e1', 'a', 'b')]
    const result = topologicalSort(nodes, edges)
    expect(result).toHaveLength(3)
    expect(result.map(n => n.id)).toContain('c')
  })
})

describe('topologicalSort — 错误推测', () => {
  it('循环依赖抛出错误', () => {
    const nodes = [node('a'), node('b')]
    const edges = [
      edge('e1', 'a', 'b'),
      edge('e2', 'b', 'a'),
    ]
    expect(() => topologicalSort(nodes, edges)).toThrow('检测到循环依赖')
  })

  it('三节点循环', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges = [
      edge('e1', 'a', 'b'),
      edge('e2', 'b', 'c'),
      edge('e3', 'c', 'a'),
    ]
    expect(() => topologicalSort(nodes, edges)).toThrow('检测到循环依赖')
  })

  it('重复边只计算一次入度', () => {
    const nodes = [node('a'), node('b')]
    const edges = [
      edge('e1', 'a', 'b', 'var-out-ok', 'var-in-execute'),
      edge('e2', 'a', 'b', 'var-out-status_code', 'var-in-status_code'),
    ]
    const result = topologicalSort(nodes, edges)
    expect(result.map(n => n.id)).toEqual(['a', 'b'])
  })

  it('重复目标节点边（同一 source 到同一 target）', () => {
    const nodes = [node('a'), node('b')]
    const edges = [
      edge('e1', 'a', 'b'),
      edge('e2', 'a', 'b'),
    ]
    const result = topologicalSort(nodes, edges)
    expect(result.map(n => n.id)).toEqual(['a', 'b'])
  })
})

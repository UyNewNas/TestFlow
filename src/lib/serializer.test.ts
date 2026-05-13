import { describe, it, expect } from 'vitest'
import { toWorkflowFile, toReactFlow } from './serializer'
import type { WorkflowFile } from '../types/nodes'

const minimalWf: WorkflowFile = {
  version: '1.0',
  metadata: { name: 'test', createdAt: '', updatedAt: '' },
  nodes: [{ id: 'n1', type: 'start', position: { x: 0, y: 0 }, data: { label: '开始', out: [] } }],
  edges: [],
}

describe('toReactFlow', () => {
  it('空节点列表', () => {
    const wf: WorkflowFile = { ...minimalWf, nodes: [] }
    const result = toReactFlow(wf)
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })

  it('单个开始节点', () => {
    const result = toReactFlow(minimalWf)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].id).toBe('n1')
    expect(result.nodes[0].type).toBe('start')
    expect(result.nodes[0].position).toEqual({ x: 0, y: 0 })
    expect(result.nodes[0].data).toEqual({ label: '开始', out: [] })
  })

  it('多条边转换 handle ID 前缀', () => {
    const wf: WorkflowFile = {
      ...minimalWf,
      nodes: [
        { id: 'n1', type: 'start', position: { x: 0, y: 0 }, data: { label: '开始', out: [] } },
        { id: 'n2', type: 'httpRequest', position: { x: 200, y: 0 }, data: { type: 'httpRequest', label: '', request: { url: '', method: 'GET', headers: {} }, in: [], out: [] } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', sourcePort: 'ok', targetPort: 'execute', type: 'data' },
        { id: 'e2', source: 'n1', target: 'n2', sourcePort: 'status_code', targetPort: 'status_code', type: 'data' },
      ],
    }
    const result = toReactFlow(wf)
    expect(result.edges).toHaveLength(2)
    expect(result.edges[0].sourceHandle).toBe('var-out-ok')
    expect(result.edges[0].targetHandle).toBe('var-in-execute')
    expect(result.edges[1].sourceHandle).toBe('var-out-status_code')
    expect(result.edges[1].targetHandle).toBe('var-in-status_code')
  })
})

describe('toWorkflowFile', () => {
  it('默认使用 "未命名工作流"', () => {
    const { nodes, edges } = toReactFlow(minimalWf)
    const wf = toWorkflowFile(nodes, edges)
    expect(wf.metadata.name).toBe('未命名工作流')
    expect(wf.version).toBe('1.0')
  })

  it('自定义名称', () => {
    const { nodes, edges } = toReactFlow(minimalWf)
    const wf = toWorkflowFile(nodes, edges, { name: 'MyWorkflow' })
    expect(wf.metadata.name).toBe('MyWorkflow')
  })

  it('提取 handle 中的端口 ID（去除 var-out- / var-in- 前缀）', () => {
    const { nodes } = toReactFlow(minimalWf)
    const edges = [
      { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'var-out-ok', targetHandle: 'var-in-execute', type: 'data' as const },
    ]
    const wf = toWorkflowFile(nodes, edges)
    expect(wf.edges[0].sourcePort).toBe('ok')
    expect(wf.edges[0].targetPort).toBe('execute')
  })

  it('handle 无前缀时返回空字符串', () => {
    const { nodes } = toReactFlow(minimalWf)
    const edges = [
      { id: 'e1', source: 'n1', target: 'n2', sourceHandle: '', targetHandle: '', type: 'data' as const },
    ]
    const wf = toWorkflowFile(nodes, edges)
    expect(wf.edges[0].sourcePort).toBe('')
    expect(wf.edges[0].targetPort).toBe('')
  })

  it('metadata 时间戳为 ISO 格式', () => {
    const { nodes, edges } = toReactFlow(minimalWf)
    const wf = toWorkflowFile(nodes, edges)
    expect(new Date(wf.metadata.createdAt).toISOString()).toBe(wf.metadata.createdAt)
    expect(new Date(wf.metadata.updatedAt).toISOString()).toBe(wf.metadata.updatedAt)
  })
})

describe('serializer — round-trip', () => {
  it('WorkflowFile → ReactFlow → WorkflowFile 保持数据一致', () => {
    const wf: WorkflowFile = {
      version: '1.0',
      metadata: { name: '测试工作流', createdAt: '', updatedAt: '' },
      nodes: [
        { id: 'n1', type: 'start', position: { x: 0, y: 0 }, data: { label: '开始', out: [] } },
        { id: 'n2', type: 'httpRequest', position: { x: 200, y: 100 }, data: { type: 'httpRequest', label: 'API', request: { url: 'https://httpbin.org/get', method: 'GET', headers: {} }, in: [], out: [] } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', sourcePort: 'ok', targetPort: 'execute', type: 'data' },
      ],
    }
    const { nodes, edges } = toReactFlow(wf)
    const back = toWorkflowFile(nodes, edges, { name: wf.metadata.name })
    expect(back.nodes).toHaveLength(wf.nodes.length)
    expect(back.nodes[0].id).toBe(wf.nodes[0].id)
    expect(back.nodes[0].type).toBe(wf.nodes[0].type)
    expect(back.edges).toHaveLength(wf.edges.length)
    expect(back.edges[0].sourcePort).toBe(wf.edges[0].sourcePort)
    expect(back.edges[0].targetPort).toBe(wf.edges[0].targetPort)
  })
})

describe('serializer — 错误推测', () => {
  it('特殊字符在名称中', () => {
    const wf: WorkflowFile = {
      ...minimalWf,
      metadata: { name: '测试 <script>alert(1)</script> & "quotes"', createdAt: '', updatedAt: '' },
    }
    const result = toReactFlow(wf)
    expect(result.nodes).toHaveLength(1)
  })

  it('大量节点', () => {
    const wf: WorkflowFile = {
      ...minimalWf,
      nodes: Array.from({ length: 100 }, (_, i) => ({
        id: `n${i}`,
        type: 'start',
        position: { x: i * 200, y: 0 },
        data: { label: `节点${i}`, out: [] },
      })),
    }
    const result = toReactFlow(wf)
    expect(result.nodes).toHaveLength(100)
  })
})

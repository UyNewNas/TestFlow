import type { Node, Edge } from '@xyflow/react'
import type { WorkflowFile, WorkflowNode, WorkflowEdge } from '../types/nodes'
import { inPortId, outPortId } from '../types/nodes'

export function toReactFlow(data: WorkflowFile): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = data.nodes.map((wn) => ({
    id: wn.id,
    type: wn.type,
    position: wn.position,
    data: wn.data as unknown as Record<string, unknown>,
  }))

  const edges: Edge[] = data.edges.map((we) => ({
    id: we.id,
    source: we.source,
    target: we.target,
    sourceHandle: outPortId(we.sourcePort),
    targetHandle: inPortId(we.targetPort),
    type: 'data',
  }))

  return { nodes, edges }
}

export function toWorkflowFile(
  nodes: Node[],
  edges: Edge[],
  metadata?: { name?: string },
): WorkflowFile {
  const now = new Date().toISOString()

  const wNodes: WorkflowNode[] = nodes.map((n) => ({
    id: n.id,
    type: n.type as WorkflowNode['type'],
    position: n.position,
    data: n.data as unknown as WorkflowNode['data'],
  }))

  const wEdges: WorkflowEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourcePort: e.sourceHandle?.replace('var-out-', '') ?? '',
    targetPort: e.targetHandle?.replace('var-in-', '') ?? '',
    type: 'data',
  }))

  return {
    version: '1.0',
    metadata: {
      name: metadata?.name ?? '未命名工作流',
      createdAt: now,
      updatedAt: now,
    },
    nodes: wNodes,
    edges: wEdges,
  }
}

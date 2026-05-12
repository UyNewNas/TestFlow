import type { CustomNode, CustomEdge } from '../types/nodes'

export function topologicalSort(nodes: CustomNode[], edges: CustomEdge[]): CustomNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adjacency.set(node.id, [])
  }

  for (const edge of edges) {
    const neighbors = adjacency.get(edge.source)
    if (neighbors && !neighbors.includes(edge.target)) {
      neighbors.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    }
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const sorted: CustomNode[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    const node = nodeMap.get(current)
    if (node) sorted.push(node)

    for (const neighbor of adjacency.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  if (sorted.length !== nodes.length) {
    const sortedIds = new Set(sorted.map((n) => n.id))
    const cycleNodes = nodes.filter((n) => !sortedIds.has(n.id))
    throw new Error(`检测到循环依赖，涉及节点：${cycleNodes.map((n) => n.id).join(', ')}`)
  }

  return sorted
}

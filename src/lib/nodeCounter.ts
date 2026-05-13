import type { Node } from '@xyflow/react'

let nodeCounter = 3

export function getNodeCounter() {
  return nodeCounter
}

export function syncNodeCounter(nodes: Node[]) {
  const maxId = nodes
    .map(n => Number(n.id))
    .filter(n => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 2)
  nodeCounter = maxId + 1
}

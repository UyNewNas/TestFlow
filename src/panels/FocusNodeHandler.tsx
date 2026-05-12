import { useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'

export default function FocusNodeHandler() {
  const rf = useReactFlow()

  useEffect(() => {
    const handler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail?.nodeId
      if (!nodeId) return
      const nodes = rf.getNodes()
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return
      rf.setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1.2, duration: 400 })
      window.dispatchEvent(new CustomEvent('flash-node', { detail: { nodeId } }))
    }
    window.addEventListener('focus-node', handler)
    return () => window.removeEventListener('focus-node', handler)
  }, [rf])

  return null
}

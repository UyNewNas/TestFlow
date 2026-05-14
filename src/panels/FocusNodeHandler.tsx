import { useEffect, useContext } from 'react'
import { useReactFlow } from '@xyflow/react'
import { EventBusContext, focusNodeRef } from '../store/eventBusContext'

export default function FocusNodeHandler() {
  const rf = useReactFlow()
  const bus = useContext(EventBusContext)

  useEffect(() => {
    focusNodeRef.current = (nodeId: string) => {
      const nodes = rf.getNodes()
      const node = nodes.find((n) => n.id === nodeId)
      if (node) {
        rf.setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1.2, duration: 400 })
      }
      bus?.flashNode(nodeId)
    }
  }, [rf, bus])

  return null
}

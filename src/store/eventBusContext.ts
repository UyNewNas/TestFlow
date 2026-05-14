import { createContext } from 'react'

export interface EventBusActions {
  deleteEdge: (edgeId: string) => void
  deleteNode: (nodeId: string) => void
  flashNode: (nodeId: string) => void
  focusNode: (nodeId: string) => void
}

export const EventBusContext = createContext<EventBusActions | null>(null)

export const focusNodeRef: { current: (nodeId: string) => void } = { current: () => {} }

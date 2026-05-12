import { useSyncExternalStore } from 'react'
import type { ExecutionStatus } from '../types/nodes'

interface FlowState {
  proxyOnline: boolean | null
  selectedNodeId: string | null
  portValues: Record<string, Record<string, unknown>>
  nodeStatuses: Record<string, ExecutionStatus>
  lastExecutionTime: number | null
}

type Listener = () => void

function createFlowStore() {
  let state: FlowState = {
    proxyOnline: null,
    selectedNodeId: null,
    portValues: {},
    nodeStatuses: {},
    lastExecutionTime: null,
  }

  const listeners = new Set<Listener>()

  function getState(): FlowState {
    return state
  }

  function subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function notify() {
    for (const l of listeners) l()
  }

  return {
    getState,
    subscribe,
    setProxyOnline(v: boolean) {
      state = { ...state, proxyOnline: v }
      notify()
    },
    setSelectedNodeId(id: string | null) {
      state = { ...state, selectedNodeId: id }
      notify()
    },
    setPortValue(nodeId: string, portId: string, value: unknown) {
      state = {
        ...state,
        portValues: {
          ...state.portValues,
          [nodeId]: { ...(state.portValues[nodeId] ?? {}), [portId]: value },
        },
      }
      notify()
    },
    setPortValues(nodeId: string, values: Record<string, unknown>) {
      state = {
        ...state,
        portValues: {
          ...state.portValues,
          [nodeId]: { ...(state.portValues[nodeId] ?? {}), ...values },
        },
      }
      notify()
    },
    getPortValue(nodeId: string, portId: string): unknown {
      return state.portValues[nodeId]?.[portId]
    },
    clearPortValues() {
      state = { ...state, portValues: {} }
      notify()
    },
    setNodeStatus(nodeId: string, status: ExecutionStatus) {
      state = { ...state, nodeStatuses: { ...state.nodeStatuses, [nodeId]: status } }
      notify()
    },
    resetAllStatuses() {
      state = { ...state, nodeStatuses: {}, lastExecutionTime: null }
      notify()
    },
    setExecutionTime(ms: number) {
      state = { ...state, lastExecutionTime: ms }
      notify()
    },
  }
}

const store = createFlowStore()

export function useFlowStore(): FlowState
export function useFlowStore<R>(selector: (s: FlowState) => R): R
export function useFlowStore<R>(selector?: (s: FlowState) => R): FlowState | R {
  return useSyncExternalStore(store.subscribe, () => {
    const s = store.getState()
    return selector ? selector(s) : s
  })
}

export function getFlowStore() {
  return store
}

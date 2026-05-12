import { useSyncExternalStore } from 'react'
import type { Node, Edge } from '@xyflow/react'

export interface CanvasData {
  id: string
  name: string
  nodes: Node[]
  edges: Edge[]
}

interface CanvasState {
  canvases: CanvasData[]
  activeCanvasId: string
}

const LS_KEY = 'testflow_canvases'
const LS_ACTIVE = 'testflow_active_canvas'

function loadAll(): CanvasData[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length > 0) return arr as CanvasData[]
    }
  } catch { /* ignore */ }
  return []
}

function saveAll(canvases: CanvasData[], activeId: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(canvases))
    localStorage.setItem(LS_ACTIVE, activeId)
  } catch { /* ignore */ }
}

type Listener = () => void

function createCanvasStore() {
  const defaultId = 'canvas-1'

  let initial = loadAll()
  if (initial.length === 0) {
    initial = [{ id: defaultId, name: '画布 1', nodes: [], edges: [] }]
  }

  const savedActive = localStorage.getItem(LS_ACTIVE)
  const activeId = savedActive && initial.find(c => c.id === savedActive) ? savedActive : initial[0].id

  let state: CanvasState = {
    canvases: initial,
    activeCanvasId: activeId,
  }

  const listeners = new Set<Listener>()

  function getState(): CanvasState {
    return state
  }

  function subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function notify() {
    for (const l of listeners) l()
    saveAll(state.canvases, state.activeCanvasId)
  }

  return {
    getState,
    subscribe,

    getActiveCanvas(): CanvasData {
      return state.canvases.find((c) => c.id === state.activeCanvasId)!
    },

    getAllCanvases(): CanvasData[] {
      return state.canvases
    },

    saveCanvasData(canvasId: string, nodes: Node[], edges: Edge[]) {
      state = {
        ...state,
        canvases: state.canvases.map((c) =>
          c.id === canvasId ? { ...c, nodes, edges } : c,
        ),
      }
      notify()
    },

    addCanvas(name: string): string {
      const id = `canvas-${Date.now()}`
      const newCanvas: CanvasData = { id, name, nodes: [], edges: [] }
      state = { ...state, canvases: [...state.canvases, newCanvas] }
      notify()
      return id
    },

    switchCanvas(canvasId: string) {
      if (state.canvases.find((c) => c.id === canvasId)) {
        state = { ...state, activeCanvasId: canvasId }
        notify()
      }
    },

    removeCanvas(canvasId: string) {
      const remaining = state.canvases.filter((c) => c.id !== canvasId)
      if (remaining.length === 0) return
      let newActiveId = state.activeCanvasId
      if (canvasId === state.activeCanvasId) newActiveId = remaining[0].id
      state = { canvases: remaining, activeCanvasId: newActiveId }
      notify()
    },

    importCanvas(data: CanvasData) {
      const existing = state.canvases.find(c => c.id === data.id)
      const newId = existing ? `canvas-${Date.now()}` : data.id
      const newName = existing ? `${data.name} (导入)` : data.name
      const canvas: CanvasData = { ...data, id: newId, name: newName }
      state = { ...state, canvases: [...state.canvases, canvas] }
      notify()
      return newId
    },

    persist() {
      saveAll(state.canvases, state.activeCanvasId)
    },
  }
}

const store = createCanvasStore()

export function useCanvasStore(): CanvasState
export function useCanvasStore<R>(selector: (s: CanvasState) => R): R
export function useCanvasStore<R>(selector?: (s: CanvasState) => R): CanvasState | R {
  return useSyncExternalStore(store.subscribe, () => {
    const s = store.getState()
    return selector ? selector(s) : s
  })
}

export function getCanvasStore() {
  return store
}

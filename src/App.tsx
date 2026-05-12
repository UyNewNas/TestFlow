import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  Controls,
  Background,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import HttpRequestNode from './nodes/HttpRequestNode'
import AssertNode from './nodes/AssertNode'
import ExtractNode from './nodes/ExtractNode'
import StartNode from './nodes/StartNode'
import HttpRequestPanel from './panels/HttpRequestPanel'
import AssertPanel from './panels/AssertPanel'
import ExtractPanel from './panels/ExtractPanel'
import StartPanel from './panels/StartPanel'
import StatsBar from './panels/StatsBar'
import ContextViewer from './panels/ContextViewer'

import { checkProxy } from './lib/proxy'
import { runWorkflow } from './lib/runner'
import { validateConnection } from './lib/validateEdges'
import { topologicalSort } from './lib/topological'

import { useFlowStore, getFlowStore } from './store/flowStore'
import { useCanvasStore, getCanvasStore } from './store/canvasStore'
import { UpdateNodeContext } from './store/updateNodeContext'
import type {
  CustomNode,
  HttpRequestNodeData,
  AssertNodeData,
  ExtractNodeData,
} from './types/nodes'
import { HTTP_DEFAULT_OUT_PORTS, ASSERT_DEFAULT_IN_PORTS, ASSERT_DEFAULT_OUT_PORTS, EXTRACT_DEFAULT_IN_PORTS, EXTRACT_DEFAULT_OUT_PORTS } from './types/nodes'

import CustomEdge from './edges/CustomEdge'
import './App.css'

const nodeTypes: NodeTypes = {
  start: StartNode,
  httpRequest: HttpRequestNode,
  assert: AssertNode,
  extract: ExtractNode,
}

const edgeTypes: EdgeTypes = { data: CustomEdge }

const createStartNode = (): Node => ({
  id: 'start',
  type: 'start',
  position: { x: 80, y: 40 },
  draggable: false,
  deletable: false,
  data: {
    label: '开始',
    type: 'start',
    out: [{ id: 'ok', label: 'ok', direction: 'out', type: 'boolean', isDefault: true }],
  },
})

const createHttpNode = (id: string, x: number, y: number): Node => ({
  id,
  type: 'httpRequest',
  position: { x, y },
  data: {
    label: '接口名称',
    type: 'httpRequest',
    request: { url: '', method: 'GET', headers: {}, body: '' },
    in: [
      { id: 'execute', label: 'execute', direction: 'in', type: 'boolean', value: true, isDefault: true },
      { id: 'data', label: 'data', direction: 'in', type: 'string' },
      { id: 'headers', label: 'headers', direction: 'in', type: 'object' },
    ],
    out: [...HTTP_DEFAULT_OUT_PORTS],
  },
})

const createAssertNode = (id: string, x: number, y: number): Node => ({
  id,
  type: 'assert',
  position: { x, y },
  data: {
    label: '断言',
    type: 'assert',
    in: [...ASSERT_DEFAULT_IN_PORTS],
    out: [...ASSERT_DEFAULT_OUT_PORTS],
    assertions: [],
  },
})

const createExtractNode = (id: string, x: number, y: number): Node => ({
  id,
  type: 'extract',
  position: { x, y },
  data: {
    label: '提取',
    type: 'extract',
    in: [...EXTRACT_DEFAULT_IN_PORTS],
    out: [...EXTRACT_DEFAULT_OUT_PORTS],
    rules: [],
  },
})

let nodeCounter = 3

function extractCycleIds(errorMsg: string): string[] {
  const match = errorMsg.match(/涉及节点：(.+)$/)
  if (!match) return []
  return match[1].split(',').map((s) => s.trim())
}

function App() {
  const activeCanvasId = useCanvasStore((s) => s.activeCanvasId)
  const canvases = useCanvasStore((s) => s.canvases)

  const activeCanvas = canvases.find((c) => c.id === activeCanvasId)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    activeCanvas?.nodes?.length
      ? activeCanvas.nodes
      : [createStartNode()],
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    activeCanvas?.edges || [],
  )

  const proxyOnline = useFlowStore((s) => s.proxyOnline)
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId)
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [cycleNodeIds, setCycleNodeIds] = useState<string[]>([])
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodeId: string
  } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkProxy().then((v) => getFlowStore().setProxyOnline(v))
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const edgeId = (e as CustomEvent).detail?.edgeId
      if (edgeId) {
        setEdges((eds) => eds.filter((ed) => ed.id !== edgeId))
      }
    }
    window.addEventListener('delete-edge', handler)
    return () => window.removeEventListener('delete-edge', handler)
  }, [setEdges])

  useEffect(() => {
    const handler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail?.nodeId
      if (nodeId) {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId))
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
        getFlowStore().setSelectedNodeId(null)
      }
    }
    window.addEventListener('delete-node', handler)
    return () => window.removeEventListener('delete-node', handler)
  }, [setNodes, setEdges])

  useEffect(() => {
    getCanvasStore().saveCanvasData(activeCanvasId, nodes, edges)
  }, [nodes, edges, activeCanvasId])

  const prevCanvasIdRef = useRef(activeCanvasId)
  useEffect(() => {
    if (prevCanvasIdRef.current !== activeCanvasId) {
      prevCanvasIdRef.current = activeCanvasId
      const canvas = canvases.find((c) => c.id === activeCanvasId)
      if (canvas) {
        setNodes(canvas.nodes?.length ? canvas.nodes : [])
        setEdges(canvas.edges || [])
      }
    }
  }, [activeCanvasId, canvases, setNodes, setEdges])

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
        ),
      )
    },
    [setNodes],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const result = validateConnection(connection, edges)
      if (!result.valid) return


      if (result.replaceEdgeId) {
        setEdges((eds) =>
          eds
            .filter((e) => e.id !== result.replaceEdgeId)
            .concat({
              id: `e-${connection.source}-${connection.target}-${Date.now()}`,
              source: connection.source,
              target: connection.target,
              sourceHandle: connection.sourceHandle,
              targetHandle: connection.targetHandle,
              type: 'data',
            }),
        )
        return
      }

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'data',
          },
          eds,
        ),
      )
    },
    [edges, setEdges],
  )

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if ('source' in connection && 'target' in connection) {
        return validateConnection(connection as Connection, edges).valid
      }
      return true
    },
    [edges],
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    getFlowStore().setSelectedNodeId(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    getFlowStore().setSelectedNodeId(null)
    setContextMenu(null)
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })))
  }, [setEdges])

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.type === 'start') return
      event.preventDefault()
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id })
    },
    [],
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as HTMLElement)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  const renderPanel = () => {
    if (!selectedNode) return null

    switch (selectedNode.type) {
      case 'httpRequest':
        return (
          <HttpRequestPanel
            nodeId={selectedNode.id}
            data={selectedNode.data as unknown as HttpRequestNodeData}
          />
        )
      case 'assert':
        return (
          <AssertPanel
            nodeId={selectedNode.id}
            data={selectedNode.data as unknown as AssertNodeData}
          />
        )
      case 'extract':
        return (
          <ExtractPanel
            nodeId={selectedNode.id}
            data={selectedNode.data as unknown as ExtractNodeData}
          />
        )
      case 'start':
        return (
          <StartPanel
            nodeId={selectedNode.id}
            data={selectedNode.data}
          />
        )
      default:
        return null
    }
  }

  const runAndSync = async (stopAt?: string) => {
    setWorkflowError(null)
    setCycleNodeIds([])
    const store = getFlowStore()
    store.resetAllStatuses()
    store.clearPortValues()

    const typedNodes = nodes.map((n) => ({
      ...n,
      data: { ...n.data },
    })) as unknown as CustomNode[]

    try {
      topologicalSort(typedNodes, edges)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setWorkflowError(msg)
      setCycleNodeIds(extractCycleIds(msg))
      return
    }

    const portValues = await runWorkflow(typedNodes, edges, (nodeId, status, data) => {
      store.setNodeStatus(nodeId, status)
      if (status === 'success' && data) {
        const node = typedNodes.find((n) => n.id === nodeId)
        if (node?.type === 'httpRequest') {
          updateNodeData(nodeId, { result: data, error: undefined })
        } else if (node?.type === 'assert') {
          updateNodeData(nodeId, { result: data })
        } else if (node?.type === 'extract') {
          updateNodeData(nodeId, { result: data, error: undefined })
        }
      } else if (status === 'error' && data) {
        const node = typedNodes.find((n) => n.id === nodeId)
        const errMsg = (data as { error: string }).error || '未知错误'
        if (node?.type === 'httpRequest' || node?.type === 'extract') {
          updateNodeData(nodeId, { error: errMsg })
        }
      }
    }, stopAt)

    for (const [nodeId, pvs] of Object.entries(portValues)) {
      store.setPortValues(nodeId, pvs)
    }

    for (const node of typedNodes) {
      updateNodeData(node.id, {
        in: node.data.in ?? [],
        out: node.data.out ?? [],
      } as Partial<HttpRequestNodeData | AssertNodeData | ExtractNodeData>)
    }
  }

  const handleRunAll = () => runAndSync()
  const handleRunToNode = (targetNodeId: string) => {
    setContextMenu(null)
    runAndSync(targetNodeId)
  }

  const addNode = (type: 'httpRequest' | 'assert' | 'extract') => {
    const id = String(nodeCounter++)
    const x = Math.random() * 300 + 100
    const y = Math.random() * 300 + 100

    let newNode: Node
    switch (type) {
      case 'httpRequest':
        newNode = createHttpNode(id, x, y)
        break
      case 'assert':
        newNode = createAssertNode(id, x, y)
        break
      case 'extract':
        newNode = createExtractNode(id, x, y)
        break
    }
    setNodes((nds) => [...nds, newNode])
  }

  const handleAddCanvas = () => {
    const name = `画布 ${canvases.length + 1}`
    const id = getCanvasStore().addCanvas(name)
    getCanvasStore().switchCanvas(id)
  }

  const handleDeleteCanvas = (canvasId: string) => {
    getCanvasStore().removeCanvas(canvasId)
  }

  const handleExportCanvas = () => {
    const canvas = activeCanvas
    if (!canvas) return
    const data = JSON.stringify(canvas, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${canvas.name || 'testflow'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCanvas = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const obj = JSON.parse(reader.result as string)
          if (obj && obj.id && obj.nodes && obj.edges) {
            const newId = getCanvasStore().importCanvas(obj)
            getCanvasStore().switchCanvas(newId)
          }
        } catch { /* ignore */ }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
    )
    getFlowStore().setSelectedNodeId(null)
    setContextMenu(null)
  }

  const handleClearCanvas = () => {
    if (!window.confirm('确定要清空当前画布吗？此操作不可撤销。')) return
    const startNode = createStartNode()
    setNodes([startNode])
    setEdges([])
    getFlowStore().setSelectedNodeId(null)
    getFlowStore().resetAllStatuses()
    getFlowStore().clearPortValues()
  }

  return (
    <UpdateNodeContext.Provider value={updateNodeData}>
      <div className="app-container">
        {proxyOnline === false && (
          <div className="proxy-warning">
            ⚠️ 代理未启动，请先运行：<code>node proxy/server.js</code>
          </div>
        )}

        {workflowError && (
          <div className="workflow-error-banner">
            <span>🔴 检测到循环依赖，无法执行</span>
            <button
              className="error-dismiss"
              onClick={() => {
                setWorkflowError(null)
                setCycleNodeIds([])
              }}
            >
              ✕
            </button>
            <div className="error-detail">
              {workflowError}
              {cycleNodeIds.length > 0 && (
                <span className="cycle-nodes">
                  参与环的节点：{cycleNodeIds.join(' → ')}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="canvas-tabs">
          <img src="/logo.png" alt="TestFlow" className="app-logo" />
          <span className="app-brand">TestFlow</span>
          <div className="canvas-tabs-list">
            {canvases.map((canvas) => (
              <div
                key={canvas.id}
                className={`canvas-tab ${canvas.id === activeCanvasId ? 'active' : ''}`}
                onClick={() => getCanvasStore().switchCanvas(canvas.id)}
              >
                <span className="canvas-tab-name">{canvas.name}</span>
                {canvases.length > 1 && (
                  <button
                    className="canvas-tab-close"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCanvas(canvas.id)
                    }}
                    title="删除画布"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className="canvas-tab-add" onClick={handleAddCanvas} title="新增画布">
            + 新画布
          </button>
        </div>

        <div className="toolbar">
          <button className="btn-add" onClick={() => addNode('httpRequest')}>
            + 请求节点
          </button>
          <button className="btn-add" onClick={() => addNode('assert')}>
            + 断言节点
          </button>
          <button className="btn-add" onClick={() => addNode('extract')}>
            + 提取节点
          </button>
          <div className="toolbar-spacer" />
          <button className="btn-file" onClick={handleClearCanvas}>
            🗑 清空
          </button>
          <button className="btn-file" onClick={handleImportCanvas}>
            📥 导入
          </button>
          <button className="btn-file" onClick={handleExportCanvas}>
            📤 导出
          </button>
          <button className="btn-run" onClick={handleRunAll}>
            ▶ Run
          </button>
        </div>

        <StatsBar />

        <div className="canvas-wrapper">
          <ContextViewer />
          <div className="canvas-area">
            <ReactFlow
              nodes={nodes}
              edges={
                cycleNodeIds.length > 0
                  ? edges.map((e) => {
                      const idSet = new Set(cycleNodeIds)
                      if (idSet.has(e.source) && idSet.has(e.target)) {
                        return { ...e, style: { stroke: '#ef4444', strokeWidth: 2 } }
                      }
                      return e
                    })
                  : edges
              }
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onNodeClick={onNodeClick}
              onNodeContextMenu={onNodeContextMenu}
              onPaneClick={onPaneClick}
              onEdgeClick={(_, edge) => {
                setEdges((eds) =>
                  eds.map((e) => (e.id === edge.id ? { ...e, selected: true } : { ...e, selected: false })),
                )
              }}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
            >
              <Controls />
              <Background color="#c0c6d4" gap={20} />
            </ReactFlow>
          </div>

          {selectedNode && <div className="panel-container">{renderPanel()}</div>}
        </div>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div
            className="context-menu-item"
            onClick={() => handleRunToNode(contextMenu.nodeId)}
          >
            ⏩ 运行到此处
          </div>
          <div className="context-menu-divider" />
          <div
            className="context-menu-item context-menu-danger"
            onClick={() => handleDeleteNode(contextMenu.nodeId)}
          >
            🗑 删除节点
          </div>
        </div>
      )}
    </UpdateNodeContext.Provider>
  )
}

export default App

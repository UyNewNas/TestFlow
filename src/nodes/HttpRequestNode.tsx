import { useRef, useLayoutEffect } from 'react'
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react'
import type { HttpRequestNodeData, VarPort } from '../types/nodes'
import { inPortId, outPortId } from '../types/nodes'
import { useFlowStore } from '../store/flowStore'

const MC: Record<string, string> = { GET: '#61affe', POST: '#49cc90', PUT: '#fca130', DELETE: '#f93e3e', PATCH: '#a78bfa' }

function portColor(p: VarPort): string | undefined {
  if (p.id === 'execute') return p.value === true ? '#06d6a0' : undefined
  if (p.id === 'ok') return p.value === true ? '#06d6a0' : p.value === false ? '#ef476f' : undefined
  return p.value !== undefined ? '#06d6a0' : undefined
}

function PortIn({ p }: { p: VarPort }) {
  const c = portColor(p)
  return (
    <div className="io-port io-port-in">
      <Handle type="target" position={Position.Left} id={inPortId(p.id)}
        className="handle-var handle-var-in"
        style={{ background: c || undefined }} />
      <span className="port-label" style={{ color: c }}>{p.label || p.id}</span>
    </div>
  )
}

function PortOut({ p }: { p: VarPort }) {
  const c = portColor(p)
  return (
    <div className="io-port io-port-out">
      <span className="port-label" style={{ color: c }}>{p.label || p.id}</span>
      <Handle type="source" position={Position.Right} id={outPortId(p.id)}
        className="handle-var handle-var-out"
        style={{ background: c || undefined }} />
    </div>
  )
}

function HttpRequestNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as HttpRequestNodeData
  const status = useFlowStore((s) => s.nodeStatuses[id])
  const req = nodeData.request ?? { url: '', method: 'GET', headers: {}, body: '' }
  const bc = status === 'running' ? '#4cc9f0' : status === 'success' ? '#06d6a0' : status === 'error' ? '#ef476f' : '#dde1e8'
  const allIn = nodeData.in ?? []; const allOut = nodeData.out ?? []
  const execP = allIn.find(p => p.id === 'execute')
  const okP = allOut.find(p => p.id === 'ok')
  const inp = allIn.filter(p => p.id !== 'execute')
  const oup = allOut.filter(p => p.id !== 'ok')

  const uni = useUpdateNodeInternals()
  const lenRef = useRef(allIn.length + allOut.length)

  useLayoutEffect(() => {
    const cur = allIn.length + allOut.length
    if (lenRef.current !== cur) {
      lenRef.current = cur
      const t = setTimeout(() => uni(id), 50)
      return () => clearTimeout(t)
    }
  }, [allIn.length, allOut.length, id, uni])

  const u = req.url || ''

  function renderUrl() {
    if (!u) return <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>—</span>
    const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g
    const parts: React.ReactNode[] = []
    let last = 0
    let m
    while ((m = re.exec(u)) !== null) {
      if (m.index > last) parts.push(u.slice(last, m.index))
      parts.push(<span key={m.index} className="ref-tag">{'{{'+m[1]+'}}'}</span>)
      last = m.index + m[0].length
    }
    if (last < u.length) parts.push(u.slice(last))
    return <span title={u}>{parts}</span>
  }

  function delNode(e: React.MouseEvent) {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('delete-node', { bubbles: true, detail: { nodeId: id } }))
  }

  return (
    <div className="custom-node" style={{ borderColor: bc }}>
      <div className="node-card">
        <div className="node-topbar">
          <span className="method-badge" style={{ background: MC[req.method] || '#888' }}>{req.method}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{nodeData.label}</span>
          {nodeData.result && <><span className={`node-chip ${nodeData.result.statusCode < 400 ? 'chip-ok' : 'chip-err'}`}>{nodeData.result.statusCode}</span><span className="node-chip chip-time">{nodeData.result.responseTime}ms</span></>}
          <button className="node-delete-btn" onClick={delNode} title="删除节点">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        <div className="node-url" title={u}>{renderUrl()}</div>
        {status === 'running' && <div className="node-scan" />}
        {status === 'error' && nodeData.error && <div className="node-errline">{nodeData.error.slice(0,60)}</div>}
      </div>

      <div className="node-ctrl">
        {execP && <PortIn p={execP} />}
        {okP && <PortOut p={okP} />}
      </div>

      <div className="node-io">
        <div className="io-col io-left">
          {inp.map(p => (<PortIn key={p.id} p={p} />))}
        </div>
        <div className="io-col io-right">
          {oup.map(p => (<PortOut key={p.id} p={p} />))}
        </div>
      </div>
    </div>
  )
}
export default HttpRequestNode

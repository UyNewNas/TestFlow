import { useRef, useLayoutEffect } from 'react'
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react'
import type { ExtractNodeData, VarPort } from '../types/nodes'
import { inPortId, outPortId } from '../types/nodes'
import { useFlowStore } from '../store/flowStore'

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

function ExtractNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as ExtractNodeData
  const status = useFlowStore((s) => s.nodeStatuses[id])
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
  }, [allIn.length + allOut.length, id, uni])

  function delNode(e: React.MouseEvent) {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('delete-node', { bubbles: true, detail: { nodeId: id } }))
  }

  return (
    <div className="custom-node" style={{ borderColor: bc }}>
      <div className="node-card">
        <div className="node-topbar">
          <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>📤 {nodeData.label}</span>
          <button className="node-delete-btn" onClick={delNode} title="删除节点">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        <div className="node-varlist">{nodeData.rules?.length === 0 && <span className="node-dim">无提取规则</span>}{nodeData.rules?.map(r => (<span key={r.name} className="ref-tag" style={{ color: '#7c3aed', background: '#f5f3ff', borderColor: '#ddd6fe' }}>{r.name}</span>))}</div>
        {nodeData.result?.extracted && <div className="node-extract-ok">{Object.entries(nodeData.result.extracted).filter(([,v]) => v !== undefined).length} 个变量已提取</div>}
        {status === 'running' && <div className="node-scan" />}
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
export default ExtractNode

import { useRef, useLayoutEffect, useContext } from 'react'
import type { NodeProps } from '@xyflow/react'
import { useUpdateNodeInternals } from '@xyflow/react'
import type { CustomNode, AssertNodeData } from '../types/nodes'
import { useFlowStore } from '../store/flowStore'
import { EventBusContext } from '../store/eventBusContext'
import { PortIn } from '../components/PortIn'
import { PortOut } from '../components/PortOut'

function AssertNode({ id, data }: NodeProps<CustomNode>) {
  const nodeData = data as AssertNodeData
  const status = useFlowStore((s) => s.nodeStatuses[id])
  const bus = useContext(EventBusContext)
  const total = nodeData.assertions?.length ?? 0; const passed = nodeData.result?.passed ?? 0
  const bc = status === 'running' ? '#4cc9f0' : status === 'success' ? (passed === total && total > 0 ? '#06d6a0' : '#ffd166') : status === 'error' ? '#ef476f' : '#dde1e8'
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

  function delNode(e: React.MouseEvent) {
    e.stopPropagation()
    bus?.deleteNode(id)
  }

  return (
    <div className="custom-node" style={{ borderColor: bc }}>
      <div className="node-card">
        <div className="node-topbar">
          <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>🔍 断言</span>
          <button className="node-delete-btn" onClick={delNode} title="删除节点">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        <div className="node-body">{nodeData.assertions?.map((r, i) => { const d = nodeData.result?.details?.[i]; const cls = d ? (d.passed ? 'assert-pass' : 'assert-fail') : 'assert-pending'; return <div key={i} className={`assert-rule ${cls}`}><span className="assert-type">{r.target}</span><span className="assert-op">{r.operator}</span><span className="assert-val">{String(r.expected).slice(0, 16)}</span>{d && <span className="assert-mark">{d.passed ? '✓' : '✗'}</span>}</div> })}{(!nodeData.assertions || nodeData.assertions.length === 0) && <span className="node-dim">无断言规则</span>}</div>
        {nodeData.result && <div className="assert-tally" style={{ color: passed === total && total > 0 ? '#059669' : passed > 0 ? '#d97706' : '#dc2626' }}>{passed}/{total} 通过</div>}
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
export default AssertNode

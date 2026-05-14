import { useRef, useLayoutEffect } from 'react'
import type { NodeProps } from '@xyflow/react'
import { useUpdateNodeInternals } from '@xyflow/react'
import type { CustomNode, VarPort } from '../types/nodes'
import { PortOut } from '../components/PortOut'

function StartNode({ id, data }: NodeProps<CustomNode>) {
  const allOut = (data.out as VarPort[]) ?? []
  const okP = allOut.find(p => p.id === 'ok')
  const oup = allOut.filter(p => p.id !== 'ok')

  const uni = useUpdateNodeInternals()
  const lenRef = useRef(allOut.length)

  useLayoutEffect(() => {
    if (lenRef.current !== allOut.length) {
      lenRef.current = allOut.length
      const t = setTimeout(() => uni(id), 50)
      return () => clearTimeout(t)
    }
  }, [allOut.length, id, uni])

  return (
    <div className="custom-node" style={{ borderColor: '#1677ff' }}>
      <div className="node-card">
        <div className="node-topbar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" stroke="#1677ff" strokeWidth="2" fill="#e6f4ff" />
            <polygon points="9,7 18,12 9,17" fill="#1677ff" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1677ff' }}>{String((data.label as string) ?? '开始')}</span>
        </div>
        <div className="node-url" style={{ color: '#8c8c8c', fontSize: 11 }}>
          工作流开始节点
        </div>
      </div>

      <div className="node-ctrl">
        <div />
        {okP && <PortOut p={okP} />}
      </div>

      {oup.length > 0 && (
        <div className="node-io">
          <div className="io-col io-left" />
          <div className="io-col io-right">
            {oup.map(p => (<PortOut key={p.id} p={p} />))}
          </div>
        </div>
      )}
    </div>
  )
}
export default StartNode

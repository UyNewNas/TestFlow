import { Handle, Position } from '@xyflow/react'
import type { VarPort } from '../types/nodes'
import { inPortId } from '../types/nodes'
import { portColor } from '../lib/portColor'

export function PortIn({ p }: { p: VarPort }) {
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

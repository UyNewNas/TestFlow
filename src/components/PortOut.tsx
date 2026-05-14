import { Handle, Position } from '@xyflow/react'
import type { VarPort } from '../types/nodes'
import { outPortId } from '../types/nodes'
import { portColor } from '../lib/portColor'

export function PortOut({ p }: { p: VarPort }) {
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

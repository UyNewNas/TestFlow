import type { ReactNode } from 'react'
import { getFlowStore } from '../store/flowStore'

interface PanelProps {
  title: string
  children: ReactNode
}

export default function ConfigPanel({ title, children }: PanelProps) {
  const close = () => getFlowStore().setSelectedNodeId(null)

  return (
    <div className="config-panel">
      <div className="panel-header">
        <h3>{title}</h3>
        <button className="panel-close" onClick={close}>
          ✕
        </button>
      </div>
      <div className="panel-body">{children}</div>
    </div>
  )
}

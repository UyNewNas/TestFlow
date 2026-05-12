import { useState } from 'react'
import { useFlowStore } from '../store/flowStore'

function safeDisplay(v: unknown): string {
  if (v === undefined) return '—'
  if (v === null) return 'null'
  if (typeof v === 'object') {
    try {
      const s = JSON.stringify(v)
      return s.slice(0, 80) + (s.length > 80 ? '…' : '')
    } catch { return '[Object]' }
  }
  return String(v).slice(0, 80)
}

export default function ContextViewer() {
  const [collapsed, setCollapsed] = useState(false)
  const portValues = useFlowStore((s) => s.portValues)

  const allEntries: { nodeId: string; portId: string; value: unknown }[] = []
  for (const [nodeId, pvs] of Object.entries(portValues)) {
    for (const [portId, value] of Object.entries(pvs)) {
      allEntries.push({ nodeId, portId, value })
    }
  }

  return (
    <div className="context-viewer">
      <div className="context-viewer-header">
        <span>📋 变量上下文 ({allEntries.length})</span>
        <button className="context-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? '展开' : '收起'}>
          {collapsed ? '▸' : '▾'}
        </button>
      </div>
      {!collapsed && (
        allEntries.length === 0 ? (
          <div className="context-empty">暂无变量，执行工作流后将在此显示</div>
        ) : (
          <div className="context-table">
            <table>
              <thead>
                <tr>
                  <th>节点</th>
                  <th>端口</th>
                  <th>值</th>
                </tr>
              </thead>
              <tbody>
                {allEntries.map((e) => (
                  <tr key={`${e.nodeId}-${e.portId}`}>
                    <td className="ctx-key">{e.nodeId}</td>
                    <td className="ctx-key">{e.portId}</td>
                    <td className="ctx-value" title={safeDisplay(e.value)}>{safeDisplay(e.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

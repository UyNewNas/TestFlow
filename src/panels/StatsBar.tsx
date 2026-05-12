import { useState } from 'react'
import { useFlowStore } from '../store/flowStore'
import { useCanvasStore } from '../store/canvasStore'

export default function StatsBar() {
  const [collapsed, setCollapsed] = useState(false)
  const nodeStatuses = useFlowStore((s) => s.nodeStatuses)
  const nodes = useCanvasStore((s) => {
    const canvas = s.canvases.find((c) => c.id === s.activeCanvasId)
    return canvas?.nodes ?? []
  })

  function httpCounts() {
    const typed = nodes.filter((n) => n.type === 'httpRequest')
    const idle = typed.filter((n) => !nodeStatuses[n.id] || nodeStatuses[n.id] === 'idle').length
    const success = typed.filter((n) => nodeStatuses[n.id] === 'success').length
    const error = typed.filter((n) => nodeStatuses[n.id] === 'error').length
    return { idle, success, error, total: typed.length }
  }

  function assertStats() {
    const typed = nodes.filter((n) => n.type === 'assert')
    const nodeIdle = typed.filter((n) => !nodeStatuses[n.id] || nodeStatuses[n.id] === 'idle').length
    const nodeSuccess = typed.filter((n) => nodeStatuses[n.id] === 'success').length
    const nodeError = typed.filter((n) => nodeStatuses[n.id] === 'error').length
    const nodeTotal = typed.length

    let totalRules = 0
    let idleRules = 0
    let passedRules = 0
    let failedRules = 0
    for (const n of typed) {
      const rules = ((n.data as Record<string, unknown>)?.assertions as unknown[])?.length ?? 0
      totalRules += rules
      const st = nodeStatuses[n.id]
      if (!st || st === 'idle') {
        idleRules += rules
      } else {
        const r = (n.data as Record<string, unknown>)?.result as { passed?: number; failed?: number } | undefined
        passedRules += r?.passed ?? 0
        failedRules += r?.failed ?? 0
      }
    }

    return { nodeIdle, nodeSuccess, nodeError, nodeTotal, totalRules, idleRules, passedRules, failedRules }
  }

  const http = httpCounts()
  const assert = assertStats()

  if (http.total + assert.nodeTotal === 0) return null

  return (
    <div className="stats-bar">
      <div className="stats-bar-header">
        <span className="stats-bar-title">📊 自动化统计</span>
        <span className="stats-bar-summary">
          请求 {http.success}/{http.total} · 断言 {assert.passedRules}/{assert.totalRules}
        </span>
        <button className="stats-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? '展开' : '收起'}>
          {collapsed ? '▸' : '▾'}
        </button>
      </div>
      {!collapsed && (
        <table className="stats-table">
          <thead>
            <tr>
              <th className="stats-th-left">类型</th>
              <th>总数</th>
              <th>未运行</th>
              <th>运行成功</th>
              <th>运行失败</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="stats-td-left">请求节点</td>
              <td className="stats-td">{http.total}</td>
              <td className="stats-td stats-idle-cell">{http.idle}</td>
              <td className="stats-td stats-success-cell">{http.success}</td>
              <td className="stats-td stats-error-cell">{http.error}</td>
            </tr>
            <tr>
              <td className="stats-td-left">断言节点</td>
              <td className="stats-td">{assert.nodeTotal}</td>
              <td className="stats-td stats-idle-cell">{assert.nodeIdle}</td>
              <td className="stats-td stats-success-cell">{assert.nodeSuccess}</td>
              <td className="stats-td stats-error-cell">{assert.nodeError}</td>
            </tr>
            <tr>
              <td className="stats-td-left">断言次数</td>
              <td className="stats-td">{assert.totalRules}</td>
              <td className="stats-td stats-idle-cell">{assert.idleRules}</td>
              <td className="stats-td stats-success-cell">{assert.passedRules}</td>
              <td className="stats-td stats-error-cell">{assert.failedRules}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}

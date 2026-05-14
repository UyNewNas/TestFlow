import { useUpdateNode } from '../store/updateNodeContext'
import type { VarPort } from '../types/nodes'
import { newPortId, uniqueName } from '../lib/portUtils'
import ConfigPanel from './ConfigPanel'

interface Props {
  nodeId: string
  data: Record<string, unknown>
}

export default function StartPanel({ nodeId, data }: Props) {
  const updateNodeData = useUpdateNode()
  const allOut: VarPort[] = ((data.out as VarPort[])?.length ? (data.out as VarPort[]) : [{ id: 'ok', label: 'ok', direction: 'out', type: 'boolean', isDefault: true }])
  const outputPorts = allOut.filter(p => p.id !== 'ok')

  function syncOut(next: VarPort[]) {
    const ok = allOut.find(p => p.id === 'ok')
    const withOk = ok ? [...next, ok] : next
    updateNodeData(nodeId, { out: withOk })
  }

  function addOutVar() {
    const name = uniqueName('变量', outputPorts)
    syncOut([...outputPorts, {
      id: newPortId('start', outputPorts),
      label: name,
      direction: 'out',
      type: 'string',
    }])
  }

  function removeOutVar(index: number) {
    const next = [...outputPorts]
    next.splice(index, 1)
    syncOut(next)
  }

  function updateLabel(index: number, label: string, blur: boolean) {
    const next = [...outputPorts]
    const trimmed = label.trim()
    if (!trimmed) return

    if (blur) {
      const others = next.filter((_, j) => j !== index)
      next[index] = { ...next[index], label: uniqueName(trimmed, others) }
    } else {
      next[index] = { ...next[index], label }
    }
    syncOut(next)
  }

  function updateValue(index: number, raw: string) {
    const next = [...outputPorts]
    let parsed: unknown = raw
    if (raw === 'true') parsed = true
    else if (raw === 'false') parsed = false
    else if (raw === 'null') parsed = null
    else if (raw !== '' && !isNaN(Number(raw))) parsed = Number(raw)
    next[index] = { ...next[index], value: parsed }
    syncOut(next)
  }

  function valueDisplay(v: VarPort): string {
    const val = v.value
    if (val === undefined) return ''
    if (val === null) return 'null'
    return String(val)
  }

  return (
    <ConfigPanel title="开始节点配置">
      <div className="panel-field">
        <label>名称</label>
        <input
          type="text"
          value={(data.label as string) ?? '开始'}
          onChange={(e) => updateNodeData(nodeId, { label: e.target.value })}
          placeholder="名称"
        />
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <span>输出变量</span>
          <button className="btn-small" onClick={addOutVar}>+ 添加</button>
        </div>
        {outputPorts.length === 0 && (
          <div className="node-dim" style={{ padding: '8px 0' }}>暂无输出变量，点击"+ 添加"创建</div>
        )}
        <div className="kv-editor">
          {outputPorts.map((v, i) => (
            <div key={v.id} className="kv-row kv-row-triple">
              <input
                type="text"
                value={v.label}
                onChange={(e) => updateLabel(i, e.target.value, false)}
                onBlur={(e) => updateLabel(i, e.target.value, true)}
                placeholder="变量名"
                style={{ flex: '0 0 40%' }}
              />
              <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>=</span>
              <input
                type="text"
                value={valueDisplay(v)}
                onChange={(e) => updateValue(i, e.target.value)}
                placeholder="值 (数字/字符串)"
                style={{ flex: '1 1 auto' }}
              />
              <button className="kv-remove" onClick={() => removeOutVar(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </ConfigPanel>
  )
}

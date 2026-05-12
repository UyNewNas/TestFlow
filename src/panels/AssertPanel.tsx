import { useUpdateNode } from '../store/updateNodeContext'
import { getFlowStore } from '../store/flowStore'
import type { AssertNodeData, AssertRule, VarPort } from '../types/nodes'
import ConfigPanel from './ConfigPanel'

interface Props {
  nodeId: string
  data: AssertNodeData
}

const OPERATORS: { value: AssertRule['operator']; label: string }[] = [
  { value: 'equal', label: '等于' },
  { value: 'not_equal', label: '不等于' },
  { value: 'contains', label: '包含' },
  { value: 'not_contains', label: '不包含' },
  { value: 'less_than', label: '小于' },
  { value: 'greater_than', label: '大于' },
  { value: 'regex', label: '正则' },
  { value: 'jsonpath', label: 'JSONPath' },
]

function newPortId(prefix: string, existing: VarPort[]): string {
  const ids = new Set(existing.map(p => p.id))
  let id: string
  do { id = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` } while (ids.has(id))
  return id
}

function uniqueName(base: string, existing: VarPort[]): string {
  const names = new Set(existing.map(p => p.label))
  if (!names.has(base)) return base
  let i = 2
  while (names.has(`${base}_${i}`)) i++
  return `${base}_${i}`
}

export default function AssertPanel({ nodeId, data }: Props) {
  const updateNodeData = useUpdateNode()

  function updateData(patch: Record<string, unknown>) {
    updateNodeData(nodeId, { ...patch, result: undefined })
    getFlowStore().setNodeStatus(nodeId, 'idle')
  }

  function updateRule(index: number, field: keyof AssertRule, value: string) {
    const rules = [...(data.assertions ?? [])]
    if (index < rules.length) rules[index] = { ...rules[index], [field]: value }
    updateData({ assertions: rules })
  }

  function removeRule(index: number) {
    updateData({ assertions: (data.assertions ?? []).filter((_, i) => i !== index) })
  }

  function addRule() {
    updateData({ assertions: [...(data.assertions ?? []), { target: 'status_code', operator: 'equal', expected: '200' }] })
  }

  const allIn: VarPort[] = data.in ?? []
  const inputPorts = allIn.filter(p => p.id !== 'execute')

  function syncIn(next: VarPort[]) {
    const withExec = [...next, ...allIn.filter(p => p.id === 'execute')]
    updateNodeData(nodeId, { in: withExec })
  }

  function addInVar() {
    const name = uniqueName('变量', inputPorts)
    syncIn([...inputPorts, {
      id: newPortId('assert_in', inputPorts),
      label: name,
      direction: 'in',
      type: 'string',
    }])
  }

  function removeInVar(index: number) {
    const next = [...inputPorts]
    next.splice(index, 1)
    syncIn(next)
  }

  function updateInVarLabel(index: number, label: string, blur: boolean) {
    const next = [...inputPorts]
    const trimmed = label.trim()
    if (!trimmed) return
    if (blur) {
      const others = next.filter((_, j) => j !== index)
      next[index] = { ...next[index], label: uniqueName(trimmed, others) }
    } else {
      next[index] = { ...next[index], label }
    }
    syncIn(next)
  }

  return (
    <ConfigPanel title="断言节点配置">
      <div className="panel-field">
        <label>名称</label>
        <input type="text" value={data.label ?? ''} onChange={(e) => updateNodeData(nodeId, { label: e.target.value })} placeholder="断言" />
      </div>

      <div className="panel-field">
        <label>断言规则</label>
        {(data.assertions ?? []).map((rule, i) => (
          <div key={i} className="assert-rule-card">
            <div className="assert-rule-header">
              <span>规则 {i + 1}</span>
              <button className="kv-remove" onClick={() => removeRule(i)}>✕</button>
            </div>
            <input type="text" value={rule.target} onChange={(e) => updateRule(i, 'target', e.target.value)} placeholder="目标变量 (如: status_code)" />
            <select value={rule.operator} onChange={(e) => updateRule(i, 'operator', e.target.value)}>
              {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="text" value={String(rule.expected)} onChange={(e) => updateRule(i, 'expected', e.target.value)} placeholder="期望值 (如: 200)" />
          </div>
        ))}
        <button className="kv-add" onClick={addRule}>+ 添加断言</button>
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <span>输入变量</span>
          <button className="btn-small" onClick={addInVar}>+ 添加</button>
        </div>
        <div className="kv-editor">
          {inputPorts.map((v, i) => (
            <div key={v.id} className="kv-row">
              <input
                type="text"
                value={v.label}
                onChange={(e) => updateInVarLabel(i, e.target.value, false)}
                onBlur={(e) => updateInVarLabel(i, e.target.value, true)}
                placeholder="变量名"
              />
              <button className="kv-remove" onClick={() => removeInVar(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </ConfigPanel>
  )
}

import { useUpdateNode } from '../store/updateNodeContext'
import { getFlowStore } from '../store/flowStore'
import type { ExtractNodeData, ExtractRule } from '../types/nodes'
import ConfigPanel from './ConfigPanel'

interface Props {
  nodeId: string
  data: ExtractNodeData
}

export default function ExtractPanel({ nodeId, data }: Props) {
  const updateNodeData = useUpdateNode()

  function updateData(patch: Record<string, unknown>) {
    updateNodeData(nodeId, { ...patch, result: undefined })
    getFlowStore().setNodeStatus(nodeId, 'idle')
  }

  function updateRule(index: number, field: keyof ExtractRule, value: string) {
    const rules = [...(data.rules ?? [])]
    if (index < rules.length) rules[index] = { ...rules[index], [field]: value }
    updateData({ rules })
  }

  function removeRule(index: number) {
    updateData({ rules: (data.rules ?? []).filter((_, i) => i !== index) })
  }

  function addRule() {
    updateData({ rules: [...(data.rules ?? []), { name: '', path: '$.' }] })
  }

  const inputPorts = (data.in ?? []).filter(p => p.id !== 'execute')

  return (
    <ConfigPanel title="变量提取节点配置">
      <div className="panel-field">
        <label>名称</label>
        <input type="text" value={data.label ?? ''} onChange={(e) => updateNodeData(nodeId, { label: e.target.value })} placeholder="提取" />
      </div>

      <div className="panel-field">
        <label>提取规则</label>
        {(data.rules ?? []).map((rule, i) => (
          <div key={i} className="extract-rule-card">
            <div className="assert-rule-header">
              <span>变量 {i + 1}</span>
              <button className="kv-remove" onClick={() => removeRule(i)}>✕</button>
            </div>
            <input type="text" value={rule.name} onChange={(e) => updateRule(i, 'name', e.target.value)} placeholder="变量名 (如: token)" />
            <input type="text" value={rule.path} onChange={(e) => updateRule(i, 'path', e.target.value)} placeholder="JSONPath (如: $.data.token)" />
          </div>
        ))}
        <button className="kv-add" onClick={addRule}>+ 添加规则</button>
      </div>

      <div className="panel-section">
        <div className="panel-section-header"><span>输入变量</span></div>
        <div className="kv-editor">
          {inputPorts.map(v => (
            <div key={v.id} className="kv-row">
              <input type="text" value={v.label} disabled placeholder="变量名" />
            </div>
          ))}
        </div>
      </div>
    </ConfigPanel>
  )
}

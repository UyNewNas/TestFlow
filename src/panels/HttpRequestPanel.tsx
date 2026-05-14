import { useUpdateNode } from '../store/updateNodeContext'
import { getFlowStore } from '../store/flowStore'
import type { HttpRequestNodeData, HttpMethod, VarPort } from '../types/nodes'
import { HTTP_DEFAULT_OUT_PORTS } from '../types/nodes'
import { newPortId, uniqueName } from '../lib/portUtils'
import ConfigPanel from './ConfigPanel'

interface Props {
  nodeId: string
  data: HttpRequestNodeData
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

export default function HttpRequestPanel({ nodeId, data }: Props) {
  const updateNodeData = useUpdateNode()
  const req = data.request ?? { url: '', method: 'GET', headers: {}, body: '' }

  function updateData(patch: Record<string, unknown>) {
    updateNodeData(nodeId, patch)
  }

  function updateRequest<K extends keyof HttpRequestNodeData['request']>(
    key: K,
    value: HttpRequestNodeData['request'][K],
  ) {
    const next = { ...req, [key]: value }
    updateData({ request: next, result: undefined, error: undefined })
    getFlowStore().setNodeStatus(nodeId, 'idle')
  }

  function updateHeader(index: number, key: string, val: string) {
    const entries = Object.entries(req.headers ?? {})
    if (index < entries.length) entries[index] = [key, val]
    else entries.push([key, val])
    updateRequest('headers', Object.fromEntries(entries.filter(([k]) => k)))
  }

  function removeHeader(index: number) {
    const entries = Object.entries(req.headers ?? {})
    entries.splice(index, 1)
    updateRequest('headers', Object.fromEntries(entries))
  }

  function addHeader() {
    updateRequest('headers', { ...(req.headers ?? {}), '': '' })
  }

  const allIn: VarPort[] = data.in ?? []
  const allOut: VarPort[] = data.out?.length ? data.out : [...HTTP_DEFAULT_OUT_PORTS]

  const inputPorts = allIn.filter(p => p.id !== 'execute')
  const outputPorts = allOut.filter(p => p.id !== 'ok')

  function syncIn(next: VarPort[]) {
    const withExec = [...next, ...allIn.filter(p => p.id === 'execute')]
    updateNodeData(nodeId, { in: withExec })
  }
  function syncOut(next: VarPort[]) {
    const withOk = [...next, ...allOut.filter(p => p.id === 'ok')]
    updateNodeData(nodeId, { out: withOk })
  }

  function updateInVar(index: number, label: string, blur: boolean) {
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

  function addInVar() {
    const name = uniqueName('变量', inputPorts)
    syncIn([...inputPorts, {
      id: newPortId('http_in', inputPorts),
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

  function addOutVar() {
    const name = uniqueName('变量', outputPorts)
    syncOut([...outputPorts, {
      id: newPortId('http_out', outputPorts),
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

  return (
    <ConfigPanel title="HTTP 请求节点配置">
      <div className="panel-field">
        <label>名称</label>
        <input
          type="text"
          value={data.label ?? ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="接口名称"
        />
      </div>
      <div className="panel-field">
        <label>请求方法</label>
        <select
          value={req.method}
          onChange={(e) => updateRequest('method', e.target.value as HttpMethod)}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="panel-field">
        <label>URL</label>
        <input
          type="text"
          value={req.url}
          onChange={(e) => updateRequest('url', e.target.value)}
          placeholder="https://example.com/api"
        />
      </div>

      <div className="panel-field">
        <label>Headers</label>
        <div className="kv-editor">
          {Object.entries(req.headers ?? {}).map(([key, val], i) => (
            <div key={i} className="kv-row">
              <input type="text" value={key} onChange={(e) => updateHeader(i, e.target.value, val)} placeholder="Key" />
              <input type="text" value={val} onChange={(e) => updateHeader(i, key, e.target.value)} placeholder="Value" />
              <button className="kv-remove" onClick={() => removeHeader(i)}>✕</button>
            </div>
          ))}
          <button className="kv-add" onClick={addHeader}>+ 添加 Header</button>
        </div>
      </div>

      <div className="panel-field">
        <label>Body</label>
        <textarea
          value={req.body ?? ''}
          onChange={(e) => updateRequest('body', e.target.value)}
          placeholder='{"key": "value"}'
          rows={6}
        />
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
                onChange={(e) => updateInVar(i, e.target.value, false)}
                onBlur={(e) => updateInVar(i, e.target.value, true)}
                placeholder="变量名"
                disabled={v.isDefault}
              />
              {!v.isDefault && <button className="kv-remove" onClick={() => removeInVar(i)}>✕</button>}
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <span>输出变量</span>
          <button className="btn-small" onClick={addOutVar}>+ 添加</button>
        </div>
        <div className="kv-editor">
          {outputPorts.map((v, i) => (
            <div key={v.id} className="kv-row">
              <input
                type="text"
                value={v.label}
                onChange={(e) => {
                  const next = [...outputPorts]
                  const trimmed = e.target.value.trim()
                  if (!trimmed) return
                  next[i] = { ...next[i], label: trimmed }
                  syncOut(next)
                }}
                onBlur={(e) => {
                  const next = [...outputPorts]
                  const trimmed = e.target.value.trim()
                  if (!trimmed) return
                  const others = next.filter((_, j) => j !== i)
                  next[i] = { ...next[i], label: uniqueName(trimmed, others) }
                  syncOut(next)
                }}
                placeholder="变量名"
              />
              <button className="kv-remove" onClick={() => removeOutVar(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </ConfigPanel>
  )
}

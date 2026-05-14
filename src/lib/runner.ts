import { JSONPath } from 'jsonpath-plus'
import { proxyFetch } from './proxy'
import { topologicalSort } from './topological'
import type { CustomNode, CustomEdge, HttpRequestNodeData, AssertNodeData } from '../types/nodes'
import { inPortId, outPortId, portIdFromHandle } from '../types/nodes'

export function isHttpRequest(node: CustomNode): node is CustomNode & { data: HttpRequestNodeData } {
  return node.type === 'httpRequest'
}
export function isAssert(node: CustomNode): node is CustomNode & { data: AssertNodeData } {
  return node.type === 'assert'
}

export type StepCallback = (nodeId: string, status: 'running' | 'success' | 'error', data?: unknown) => void

async function executeNode(
  node: CustomNode,
  allPortValues: Record<string, Record<string, unknown>>,
  inputValues: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ctx: Record<string, unknown> = {}
  for (const [, pvs] of Object.entries(allPortValues)) {
    for (const [pid, pv] of Object.entries(pvs)) {
      const k = portIdFromHandle(pid)
      if (k) ctx[k] = pv
    }
  }
  for (const [key, val] of Object.entries(inputValues)) {
    const pid = portIdFromHandle(key)
    if (pid) ctx[pid] = val
    else ctx[key] = val
  }

  if (isHttpRequest(node)) {
    const url = resolveTemplate(node.data.request.url, ctx)
    let headers: Record<string, string> = {}
    const wiredHeaders = inputValues[inPortId('headers')]
    if (wiredHeaders !== undefined && typeof wiredHeaders === 'object') {
      headers = wiredHeaders as Record<string, string>
    } else {
      for (const [k, v] of Object.entries(node.data.request.headers)) {
        headers[k] = resolveTemplate(v, ctx)
      }
    }
    let body: string | undefined
    const wiredData = inputValues[inPortId('data')]
    if (wiredData !== undefined) {
      body = typeof wiredData === 'string' ? wiredData : JSON.stringify(wiredData)
    } else {
      body = node.data.request.body ? resolveTemplate(node.data.request.body, ctx) : undefined
    }
    const response = await proxyFetch(url, { method: node.data.request.method, headers, body })
    return { statusCode: response.status, responseTime: response.time, responseBody: response.body, resolvedUrl: url }
  }

  if (isAssert(node)) {
    const sourceResponse: Record<string, unknown> = {}
    for (const p of node.data.in) {
      const v = inputValues[inPortId(p.id)] ?? ctx[p.id]
      if (v !== undefined) sourceResponse[p.id] = v
    }
    const details = node.data.assertions.map((rule) => {
      try {
        const resolvedExpected = resolveTemplate(String(rule.expected), ctx)
        let actual: unknown = undefined
        let passed = false
        switch (rule.operator) {
          case 'equal': actual = sourceResponse[rule.target]; passed = String(actual) === String(resolvedExpected); break
          case 'not_equal': actual = sourceResponse[rule.target]; passed = String(actual) !== String(resolvedExpected); break
          case 'contains': actual = sourceResponse[rule.target]; passed = String(actual ?? '').includes(String(resolvedExpected)); break
          case 'not_contains': actual = sourceResponse[rule.target]; passed = !String(actual ?? '').includes(String(resolvedExpected)); break
          case 'less_than': actual = sourceResponse[rule.target]; passed = Number(actual) < Number(resolvedExpected); break
          case 'greater_than': actual = sourceResponse[rule.target]; passed = Number(actual) > Number(resolvedExpected); break
          case 'regex': { actual = sourceResponse[rule.target]; const re = new RegExp(String(resolvedExpected)); passed = re.test(String(actual ?? '')); break }
          case 'jsonpath': { const matches = JSONPath({ path: String(resolvedExpected), json: sourceResponse, wrap: false }); actual = matches; passed = matches !== undefined && matches !== null; break }
        }
        return { rule, passed, actual, message: passed ? '通过' : `期望 ${rule.operator} ${resolvedExpected}` }
      } catch (err) {
        return { rule, passed: false, actual: undefined, message: err instanceof Error ? err.message : String(err) }
      }
    })
    return { total: details.length, passed: details.filter(d => d.passed).length, failed: details.filter(d => !d.passed).length, details }
  }

  if (node.type === 'start') return {}

  throw new Error(`未知节点类型：${node.type}`)
}

function buildInputMap(edges: CustomEdge[]): Map<string, { source: string; sourceHandle: string }> {
  const map = new Map<string, { source: string; sourceHandle: string }>()
  for (const e of edges) {
    if (e.sourceHandle && e.targetHandle) {
      map.set(`${e.target}::${e.targetHandle}`, { source: e.source, sourceHandle: e.sourceHandle })
    }
  }
  return map
}

export async function runWorkflow(
  nodes: CustomNode[],
  edges: CustomEdge[],
  callback: StepCallback,
  stopAt?: string,
  sorted?: CustomNode[],
): Promise<Record<string, Record<string, unknown>>> {
  const cloned = structuredClone(nodes) as CustomNode[]
  const sortedNodes = sorted ?? topologicalSort(cloned, edges)
  const allPortValues: Record<string, Record<string, unknown>> = {}
  const outputStore = new Map<string, Record<string, unknown>>()
  const edgeMap = buildInputMap(edges)

  for (const node of sortedNodes) {
    if (stopAt && node.id === stopAt) break

    const execEdge = edgeMap.get(`${node.id}::${inPortId('execute')}`)
    let shouldRun = true
    if (execEdge) {
      const srcOutputs = outputStore.get(execEdge.source)
      if (srcOutputs) {
        const execVal = srcOutputs[execEdge.sourceHandle]
        shouldRun = execVal === true || execVal === 1 || execVal === '1' || execVal === 'true'
      } else {
        shouldRun = false
      }
    }

    if (!shouldRun) {
      for (const p of node.data.out ?? []) {
        if (p.id === 'ok') p.value = false
      }
      continue
    }

    callback(node.id, 'running')

    const inputValues: Record<string, unknown> = {}
    for (const key of edgeMap.keys()) {
      const [targetNodeId, targetHandle] = key.split('::')
      if (targetNodeId === node.id) {
        const edge = edgeMap.get(key)!
        const srcOutputs = outputStore.get(edge.source)
        if (srcOutputs) {
          const value = srcOutputs[edge.sourceHandle]
          inputValues[targetHandle] = value
          const pid = portIdFromHandle(targetHandle)
          if (pid) {
            for (const p of node.data.in ?? []) {
              if (p.id === pid) {
                p.value = value
                if (p.label && p.label !== p.id) inputValues[p.label] = value
                break
              }
            }
          }
        }
      }
    }

    try {
      const result = await executeNode(node, allPortValues, inputValues)

      const outValues: Record<string, unknown> = {}

      if (isHttpRequest(node)) {
        outValues[outPortId('ok')] = true
        outValues[outPortId('status_code')] = (result as Record<string, unknown>).statusCode
        outValues[outPortId('response_time')] = (result as Record<string, unknown>).responseTime
        outValues[outPortId('response_body')] = (result as Record<string, unknown>).responseBody
      } else if (node.type === 'start') {
        outValues[outPortId('ok')] = true
        for (const p of (node.data.out ?? [])) {
          if (p.id !== 'ok' && p.value !== undefined) {
            outValues[outPortId(p.id)] = p.value
          }
        }
      } else {
        outValues[outPortId('ok')] = true
      }

      outputStore.set(node.id, outValues)
      allPortValues[node.id] = outValues
      for (const p of node.data.out ?? []) {
        p.value = outValues[outPortId(p.id)]
      }

      callback(node.id, 'success', result)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const outValues: Record<string, unknown> = { [outPortId('ok')]: false }
      outputStore.set(node.id, outValues)
      for (const p of node.data.out ?? []) {
        p.value = outValues[outPortId(p.id)]
      }
      callback(node.id, 'error', { error: errMsg })
      break
    }
  }

  return allPortValues
}

function resolveTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g, (_, key: string) => {
    const parts = key.split('.')
    let val: unknown = context
    for (const p of parts) {
      if (val && typeof val === 'object') val = (val as Record<string, unknown>)[p]
      else throw new Error(`变量 "${key}" 未定义`)
    }
    if (val === undefined) throw new Error(`变量 "${key}" 未定义`)
    return String(val)
  })
}

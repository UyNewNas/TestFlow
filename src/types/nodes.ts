import type { Node, Edge } from '@xyflow/react'

export type NodeType = 'start' | 'httpRequest' | 'assert' | 'extract'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// ══════════ VarPort ══════════

export interface VarPort {
  id: string
  label: string
  direction: 'in' | 'out'
  type: 'string' | 'number' | 'object' | 'boolean'
  value?: unknown
  isDefault?: boolean
}

// ══════════ Handle helpers ══════════

export function inPortId(portId: string): string {
  return `var-in-${portId}`
}
export function outPortId(portId: string): string {
  return `var-out-${portId}`
}
export function portIdFromHandle(handleId: string): string | null {
  if (handleId.startsWith('var-in-')) return handleId.slice('var-in-'.length)
  if (handleId.startsWith('var-out-')) return handleId.slice('var-out-'.length)
  return null
}

// ══════════ Default ports ══════════

const EXECUTE_IN: VarPort = { id: 'execute', label: 'execute', direction: 'in', type: 'boolean', value: true, isDefault: true }
const OK_OUT: VarPort = { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', isDefault: true }

export const HTTP_DEFAULT_OUT_PORTS: VarPort[] = [
  { id: 'status_code', label: 'status_code', direction: 'out', type: 'number', isDefault: true },
  { id: 'response_time', label: 'response_time', direction: 'out', type: 'number', isDefault: true },
  { id: 'response_body', label: 'response_body', direction: 'out', type: 'object', isDefault: true },
  OK_OUT,
]

export const ASSERT_DEFAULT_IN_PORTS: VarPort[] = [
  { id: 'status_code', label: 'status_code', direction: 'in', type: 'number', isDefault: true },
  { id: 'response_time', label: 'response_time', direction: 'in', type: 'number', isDefault: true },
  { id: 'response_body', label: 'response_body', direction: 'in', type: 'object', isDefault: true },
  EXECUTE_IN,
]

export const ASSERT_DEFAULT_OUT_PORTS: VarPort[] = [OK_OUT]

export const EXTRACT_DEFAULT_IN_PORTS: VarPort[] = [
  { id: 'source', label: 'source', direction: 'in', type: 'object' },
  EXECUTE_IN,
]

export const EXTRACT_DEFAULT_OUT_PORTS: VarPort[] = [OK_OUT]

// ══════════ Node Data ══════════

export interface HttpRequestNodeData {
  label: string
  type: 'httpRequest'
  request: {
    url: string
    method: HttpMethod
    headers: Record<string, string>
    body?: string
  }
  in: VarPort[]
  out: VarPort[]
  result?: {
    statusCode: number
    responseTime: number
    responseBody: unknown
    resolvedUrl: string
  }
  error?: string
}

export interface AssertNodeData {
  label: string
  type: 'assert'
  in: VarPort[]
  out: VarPort[]
  assertions: AssertRule[]
  result?: {
    total: number
    passed: number
    failed: number
    details: AssertDetail[]
  }
}

export interface AssertRule {
  target: string
  operator: 'equal' | 'not_equal' | 'contains' | 'not_contains' | 'less_than' | 'greater_than' | 'regex' | 'jsonpath'
  expected: unknown
}

export interface AssertDetail {
  rule: AssertRule
  passed: boolean
  actual: unknown
  message: string
}

export interface ExtractNodeData {
  label: string
  type: 'extract'
  in: VarPort[]
  out: VarPort[]
  rules: ExtractRule[]
  result?: {
    extracted: Record<string, unknown>
  }
  error?: string
}

export interface ExtractRule {
  name: string
  path: string
}

export type CustomNodeData = HttpRequestNodeData | AssertNodeData | ExtractNodeData

// ══════════ ReactFlow / Execution ══════════

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error'
export type CustomNode = Node<CustomNodeData & Record<string, unknown>, NodeType>
export type CustomEdge = Edge

// ══════════ WorkflowFile ══════════

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourcePort: string
  targetPort: string
  type: 'data'
}

export interface WorkflowFile {
  version: '1.0'
  metadata: { name: string; createdAt: string; updatedAt: string }
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface WorkflowNode {
  id: string
  type: 'start' | 'httpRequest' | 'assert' | 'extract'
  position: { x: number; y: number }
  data: HttpRequestNodeData | AssertNodeData | ExtractNodeData
}

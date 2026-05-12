import type { Connection, Edge } from '@xyflow/react'
import { portIdFromHandle } from '../types/nodes'

export interface ValidationResult {
  valid: boolean
  reason?: string
  replaceEdgeId?: string
}

export function validateConnection(
  connection: Connection,
  existingEdges: Edge[],
): ValidationResult {
  const { source, target, sourceHandle, targetHandle } = connection

  if (!source || !target) {
    return { valid: false, reason: '缺少源节点或目标节点' }
  }

  if (source === target) {
    return { valid: false, reason: '不能连接自身' }
  }

  if (!sourceHandle || !targetHandle) {
    return { valid: false, reason: '缺少连接点信息' }
  }

  const srcPortId = portIdFromHandle(sourceHandle)
  const tgtPortId = portIdFromHandle(targetHandle)
  if (!srcPortId || !tgtPortId) {
    return { valid: false, reason: '端口 ID 无效' }
  }

  const isDuplicate = existingEdges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      e.sourceHandle === sourceHandle &&
      e.targetHandle === targetHandle,
  )
  if (isDuplicate) {
    return { valid: false, reason: '该连线已存在' }
  }

  const existingTarget = existingEdges.find(
    (e) => e.target === target && e.targetHandle === targetHandle,
  )
  if (existingTarget) {
    return { valid: true, replaceEdgeId: existingTarget.id }
  }

  return { valid: true }
}

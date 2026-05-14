import type { VarPort } from '../types/nodes'

export function portColor(p: VarPort): string | undefined {
  if (p.id === 'execute') return p.value === true ? '#06d6a0' : undefined
  if (p.id === 'ok') return p.value === true ? '#06d6a0' : p.value === false ? '#ef476f' : undefined
  return p.value !== undefined ? '#06d6a0' : undefined
}

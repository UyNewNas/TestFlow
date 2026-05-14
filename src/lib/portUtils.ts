import type { VarPort } from '../types/nodes'

export function newPortId(prefix: string, existing: VarPort[]): string {
  const ids = new Set(existing.map(p => p.id))
  let id: string
  do { id = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` } while (ids.has(id))
  return id
}

export function uniqueName(base: string, existing: VarPort[]): string {
  const names = new Set(existing.map(p => p.label))
  if (!names.has(base)) return base
  let i = 2
  while (names.has(`${base}_${i}`)) i++
  return `${base}_${i}`
}

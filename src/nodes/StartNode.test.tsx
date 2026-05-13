import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import StartNode from './StartNode'
import type { VarPort } from '../types/nodes'

function okPort(value?: boolean): VarPort {
  return { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value }
}

function renderNode(data: Record<string, unknown>) {
  return render(
    <ReactFlowProvider>
      <StartNode id="n1" data={data} />
    </ReactFlowProvider>,
  )
}

describe('StartNode', () => {
  it('渲染默认标签 "开始"', () => {
    renderNode({ label: '开始', out: [] })
    expect(screen.getByText('开始')).toBeInTheDocument()
  })

  it('渲染自定义标签', () => {
    renderNode({ label: 'My Start', out: [] })
    expect(screen.getByText('My Start')).toBeInTheDocument()
  })

  it('渲染副标题 "工作流开始节点"', () => {
    renderNode({ label: '开始', out: [] })
    expect(screen.getByText('工作流开始节点')).toBeInTheDocument()
  })

  it('渲染 ok 端口', () => {
    renderNode({ label: '开始', out: [okPort()] })
    expect(screen.getByText('ok')).toBeInTheDocument()
  })

  it('渲染多个自定义输出端口', () => {
    renderNode({ label: '开始', out: [
      okPort(),
      { id: 'name', label: '用户名称', direction: 'out', type: 'string' },
      { id: 'age', label: '年龄', direction: 'out', type: 'number', value: 25 },
    ]})
    expect(screen.getByText('用户名称')).toBeInTheDocument()
    expect(screen.getByText('年龄')).toBeInTheDocument()
  })

  it('portColor: ok 为 true → 绿色', () => {
    renderNode({ label: '开始', out: [okPort(true)] })
    const label = screen.getByText('ok')
    expect(label).toHaveStyle({ color: '#06d6a0' })
  })

  it('portColor: ok 为 false → 红色', () => {
    renderNode({ label: '开始', out: [okPort(false)] })
    const label = screen.getByText('ok')
    expect(label).toHaveStyle({ color: '#ef476f' })
  })

  it('portColor: 非 ok 端口有值 → 绿色', () => {
    renderNode({ label: '开始', out: [
      { id: 'name', label: 'name', direction: 'out', type: 'string', value: 'Alice' },
    ]})
    const label = screen.getByText('name')
    expect(label).toHaveStyle({ color: '#06d6a0' })
  })

  it('portColor: 端口值为 undefined → 无颜色', () => {
    renderNode({ label: '开始', out: [
      { id: 'name', label: 'name', direction: 'out', type: 'string' },
    ]})
    const label = screen.getByText('name')
    expect(label.getAttribute('style')).toBeFalsy()
  })

  it('无输出端口时仍正常渲染', () => {
    renderNode({ label: '开始', out: [] })
    expect(screen.getByText('开始')).toBeInTheDocument()
    expect(screen.queryByText('ok')).not.toBeInTheDocument()
  })

  it('label 为 undefined 时显示 "开始"', () => {
    renderNode({ label: undefined as unknown as string, out: [] })
    expect(screen.getByText('开始')).toBeInTheDocument()
  })

  it('自定义端口使用 label 作为显示文本', () => {
    renderNode({ label: '开始', out: [
      { id: 'custom_id', label: '自定义标签', direction: 'out', type: 'string', value: 'test' },
    ]})
    expect(screen.getByText('自定义标签')).toBeInTheDocument()
  })
})

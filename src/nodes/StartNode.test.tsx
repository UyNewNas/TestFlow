import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import StartNode from './StartNode'
import type { VarPort, StartNodeData } from '../types/nodes'

function okPort(value?: boolean): VarPort {
  return { id: 'ok', label: 'ok', direction: 'out', type: 'boolean', value }
}

function st(label: string, out: VarPort[] = []): StartNodeData {
  return { type: 'start', label, out }
}

const nodeBase = {
  type: 'start' as const,
  dragging: false,
  zIndex: 0,
  selectable: true,
  deletable: false,
  selected: false,
  draggable: false,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
}

function renderNode(data: StartNodeData) {
  return render(
    <ReactFlowProvider>
      <StartNode id="n1" data={data} {...nodeBase} />
    </ReactFlowProvider>,
  )
}

describe('StartNode', () => {
  it('渲染默认标签 "开始"', () => {
    renderNode(st('开始'))
    expect(screen.getByText('开始')).toBeInTheDocument()
  })

  it('渲染自定义标签', () => {
    renderNode(st('My Start'))
    expect(screen.getByText('My Start')).toBeInTheDocument()
  })

  it('渲染副标题 "工作流开始节点"', () => {
    renderNode(st('开始'))
    expect(screen.getByText('工作流开始节点')).toBeInTheDocument()
  })

  it('渲染 ok 端口', () => {
    renderNode(st('开始', [okPort()]))
    expect(screen.getByText('ok')).toBeInTheDocument()
  })

  it('渲染多个自定义输出端口', () => {
    renderNode(st('开始', [
      okPort(),
      { id: 'name', label: '用户名称', direction: 'out', type: 'string' },
      { id: 'age', label: '年龄', direction: 'out', type: 'number', value: 25 },
    ]))
    expect(screen.getByText('用户名称')).toBeInTheDocument()
    expect(screen.getByText('年龄')).toBeInTheDocument()
  })

  it('portColor: ok 为 true → 绿色', () => {
    renderNode(st('开始', [okPort(true)]))
    const label = screen.getByText('ok')
    expect(label).toHaveStyle({ color: '#06d6a0' })
  })

  it('portColor: ok 为 false → 红色', () => {
    renderNode(st('开始', [okPort(false)]))
    const label = screen.getByText('ok')
    expect(label).toHaveStyle({ color: '#ef476f' })
  })

  it('portColor: 非 ok 端口有值 → 绿色', () => {
    renderNode(st('开始', [
      { id: 'name', label: 'name', direction: 'out', type: 'string', value: 'Alice' },
    ]))
    const label = screen.getByText('name')
    expect(label).toHaveStyle({ color: '#06d6a0' })
  })

  it('portColor: 端口值为 undefined → 无颜色', () => {
    renderNode(st('开始', [
      { id: 'name', label: 'name', direction: 'out', type: 'string' },
    ]))
    const label = screen.getByText('name')
    expect(label.getAttribute('style')).toBeFalsy()
  })

  it('无输出端口时仍正常渲染', () => {
    renderNode(st('开始'))
    expect(screen.getByText('开始')).toBeInTheDocument()
    expect(screen.queryByText('ok')).not.toBeInTheDocument()
  })

  it('label 为 undefined 时显示 "开始"', () => {
    renderNode(st(undefined as unknown as string))
    expect(screen.getByText('开始')).toBeInTheDocument()
  })

  it('自定义端口使用 label 作为显示文本', () => {
    renderNode(st('开始', [
      { id: 'custom_id', label: '自定义标签', direction: 'out', type: 'string', value: 'test' },
    ]))
    expect(screen.getByText('自定义标签')).toBeInTheDocument()
  })
})

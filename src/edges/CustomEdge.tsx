import { memo, useState, useCallback, useContext } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'
import { EventBusContext } from '../store/eventBusContext'

function midPoint(t: number, a: number, b: number, c: number, d: number) {
  const u = 1 - t
  return a * u * u * u + 3 * b * u * u * t + 3 * c * u * t * t + d * t * t * t
}

function arrowPath(cx: number, cy: number, angle: number, size: number) {
  const r = (angle * Math.PI) / 180
  const x1 = cx - size * Math.cos(r - 0.5)
  const y1 = cy - size * Math.sin(r - 0.5)
  const x2 = cx - size * Math.cos(r + 0.5)
  const y2 = cy - size * Math.sin(r + 0.5)
  return `M ${x1} ${y1} L ${cx} ${cy} L ${x2} ${y2} Z`
}

export default memo(function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
}: EdgeProps) {
  const [hovering, setHovering] = useState(false)
  const bus = useContext(EventBusContext)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.16,
  })

  const cpX1 = sourcePosition === 'right' ? sourceX + 50 : sourceX - 50
  const cpX2 = targetPosition === 'left' ? targetX - 50 : targetX + 50
  const mx = midPoint(0.5, sourceX, cpX1, cpX2, targetX)
  const my = midPoint(0.5, sourceY, sourceY, targetY, targetY)

  const angle = Math.atan2(targetY - my, targetX - mx) * (180 / Math.PI)

  const onDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    bus?.deleteEdge(id)
  }, [id, bus])

  const visible = selected || hovering
  const stroke = selected ? '#1677ff' : '#d9d9d9'

  return (
    <>
      <g
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke,
            strokeWidth: selected ? 2 : 1.5,
            ...style,
          }}
        />
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          style={{ pointerEvents: 'stroke' }}
        />
        {/* arrow at midpoint */}
        <path
          d={arrowPath(mx, my, angle, 6)}
          fill={stroke}
        />
      </g>
      <EdgeLabelRenderer>
        <div
          className="nopan nodrag"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: visible ? 'all' : 'none',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.15s',
          }}
        >
          <button
            className="edge-delete-btn"
            onClick={onDelete}
            title="删除连线"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
})

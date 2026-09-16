import { useId, useState } from 'react'
import { INTELLIGENCE_KEYS, MAX_SCORE_PER_INTELLIGENCE, DEFINITIONS } from '../lib/intelligences'
import type { IntelligenceKey } from '../lib/types'
import { useI18n } from '../i18n'

interface Props {
  scores: Record<IntelligenceKey, number>
  size?: number
}

/**
 * One series, seven axes. A single series needs no legend — the heading names
 * it — so identity is carried by the axis labels, not by colour.
 */
export default function RadarChart({ scores, size = 320 }: Props) {
  const { locale } = useI18n()
  const [hover, setHover] = useState<IntelligenceKey | null>(null)
  const clipId = useId()

  // The axis labels sit outside the plot, and "Intrapersonal" is wide, so the
  // viewBox is wider than the plot circle. Without this the left and right
  // labels get clipped at the SVG edge.
  // Labels sit on a ring at 1.14x the radius, with the score on a second line
  // 13px below. Solving for both edges:
  //   top:    cy - 1.14R >= 12
  //   bottom: cy + 1.14R + 13 <= height - 6
  // With cy = height/2 that needs height >= 2.28R + 38. Deriving R from the
  // height instead keeps the labels inside the box at every size.
  const labelGutter = 86
  const width = size + labelGutter * 2
  const height = size
  const cx = width / 2
  const cy = height / 2
  const radius = (size - 60) / 2.28
  const rings = [0.25, 0.5, 0.75, 1]

  const angleFor = (i: number) => (Math.PI * 2 * i) / INTELLIGENCE_KEYS.length - Math.PI / 2
  const pointAt = (i: number, ratio: number) => {
    const a = angleFor(i)
    return [cx + Math.cos(a) * radius * ratio, cy + Math.sin(a) * radius * ratio] as const
  }

  const vertices = INTELLIGENCE_KEYS.map((key, i) => {
    const ratio = Math.min(scores[key] / MAX_SCORE_PER_INTELLIGENCE, 1)
    return { key, i, ratio, point: pointAt(i, ratio) }
  })

  const path = vertices.map((v) => v.point.join(',')).join(' ')

  return (
    <div className="relative">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxWidth: width }}
        role="img"
        aria-label={
          locale === 'ms'
            ? 'Carta radar tujuh kecerdasan'
            : 'Radar chart of seven intelligences'
        }
        className="max-w-full"
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={radius + 1} />
          </clipPath>
        </defs>

        {/* recessive grid */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={INTELLIGENCE_KEYS.map((_, i) => pointAt(i, r).join(',')).join(' ')}
            fill="none"
            stroke="var(--gridline)"
            strokeWidth={1}
          />
        ))}
        {INTELLIGENCE_KEYS.map((_, i) => {
          const [x, y] = pointAt(i, 1)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--gridline)" strokeWidth={1} />
        })}

        {/* the series */}
        <polygon
          points={path}
          clipPath={`url(#${clipId})`}
          fill="var(--series-1)"
          fillOpacity={0.16}
          stroke="var(--series-1)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {vertices.map((v) => (
          <circle
            key={v.key}
            cx={v.point[0]}
            cy={v.point[1]}
            r={hover === v.key ? 7 : 5}
            fill="var(--series-1)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ))}

        {/* axis labels + values, so the numbers never depend on hover alone */}
        {INTELLIGENCE_KEYS.map((key, i) => {
          const [x, y] = pointAt(i, 1.14)
          const def = DEFINITIONS[key]
          const anchor = Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end'
          return (
            <g key={key}>
              <text
                x={x}
                y={y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--text-2)"
              >
                {(locale === 'ms' ? def.name_ms : def.name_en).split('-')[0]}
              </text>
              <text
                x={x}
                y={y + 13}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={600}
                fill="var(--text)"
                className="tnum"
              >
                {scores[key]}
              </text>
            </g>
          )
        })}

        {/* generous hit targets, drawn last so they sit on top */}
        {vertices.map((v) => (
          <circle
            key={`hit-${v.key}`}
            cx={v.point[0]}
            cy={v.point[1]}
            r={16}
            fill="transparent"
            onMouseEnter={() => setHover(v.key)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {hover && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg bg-navy-700 px-3 py-1.5 text-xs text-white shadow-lg">
          {locale === 'ms' ? DEFINITIONS[hover].name_ms : DEFINITIONS[hover].name_en}:{' '}
          <span className="tnum font-semibold">
            {scores[hover]}/{MAX_SCORE_PER_INTELLIGENCE}
          </span>
        </div>
      )}
    </div>
  )
}

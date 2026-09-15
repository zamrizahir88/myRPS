interface Props {
  value: number
  max: number
  label?: string
  /** Right-hand caption, e.g. "60 / 140". */
  caption?: string
  color?: string
  height?: number
}

/**
 * One measure against a target: a single bar, one hue, rounded data-end
 * anchored to the baseline. The value is always written out, never left to
 * colour or length alone.
 */
export default function ProgressBar({
  value, max, label, caption, color = 'var(--series-1)', height = 10,
}: Props) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      {(label || caption) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && <span className="text-sm font-medium text-ink">{label}</span>}
          {caption && <span className="tnum text-xs text-ink-secondary">{caption}</span>}
        </div>
      )}
      <div
        className="w-full overflow-hidden rounded-full bg-[#eeeeea]"
        style={{ height }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

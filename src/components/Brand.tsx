/**
 * myRPS mark — a graduation-cap silhouette over the navy crest colour, with
 * the gold spark from the UniMAP dots. Deliberately NOT the university crest:
 * this is a personal initiative, and reusing the official mark would imply it
 * is sanctioned.
 */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <rect width="48" height="48" rx="13" fill="#1A2A6C" />
      <path d="M24 13 8 20l16 7 16-7-16-7Z" fill="#FFC627" />
      <path d="M14 24.5V31c0 2.5 4.5 4.5 10 4.5s10-2 10-4.5v-6.5l-10 4.4-10-4.4Z" fill="#fff" fillOpacity=".92" />
      <circle cx="38.5" cy="24" r="2" fill="#FFC627" />
      <path d="M38.5 24v7" stroke="#FFC627" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display text-lg font-extrabold tracking-tight ${className}`}>
      <span style={{ color: 'var(--brand)' }}>my</span>
      <span style={{ color: 'var(--text)' }}>RPS</span>
    </span>
  )
}

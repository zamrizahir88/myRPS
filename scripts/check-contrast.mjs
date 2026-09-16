#!/usr/bin/env node
/**
 * Walks every visible text node in the kitchen-sink preview, in both themes,
 * and measures it against WCAG contrast. Catches the class of bug where a
 * hardcoded light tint keeps its colour in dark mode while the text flips to
 * near-white.
 *
 *   npm run dev -- --port 5182     (in another terminal)
 *   node scripts/check-contrast.mjs
 */
import { chromium } from 'playwright'

const URL = process.env.PREVIEW_URL ?? 'http://localhost:5182/myRPS/preview.html'

const AUDIT = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null
  }
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
  }
  // The nearest ancestor that actually paints a background.
  const bgOf = (el) => {
    let node = el
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor)
      if (c && c.a > 0.85) return c
      node = node.parentElement
    }
    return parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 }
  }

  const out = []
  document.querySelectorAll('*').forEach((el) => {
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim()
    if (!text) return
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden' || style.display === 'none' || +style.opacity < 0.2) return
    const box = el.getBoundingClientRect()
    if (box.width < 2 || box.height < 2) return

    const fg = parse(style.color)
    if (!fg || fg.a < 0.5) return
    const size = parseFloat(style.fontSize)
    const bold = +style.fontWeight >= 700
    const large = size >= 24 || (size >= 18.66 && bold)
    const need = large ? 3 : 4.5
    const r = ratio(fg, bgOf(el))
    if (r < need) {
      out.push({
        text: text.slice(0, 42),
        ratio: +r.toFixed(2),
        need,
        color: style.color,
        on: `rgb(${bgOf(el).r}, ${bgOf(el).g}, ${bgOf(el).b})`,
        cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 48),
      })
    }
  })
  return out
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
let failures = 0

for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 1400 } })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
  await page.waitForTimeout(400)
  const issues = await page.evaluate(AUDIT)

  if (issues.length === 0) {
    console.log(`  ${theme.padEnd(5)} no contrast failures`)
  } else {
    failures += issues.length
    console.log(`  ${theme.padEnd(5)} ${issues.length} failure(s):`)
    for (const i of issues) {
      console.log(`    "${i.text}"  ${i.ratio}:1 (needs ${i.need})  ${i.color} on ${i.on}`)
      if (i.cls) console.log(`        class: ${i.cls}`)
    }
  }
  await page.close()
}

await browser.close()
process.exit(failures ? 1 : 0)

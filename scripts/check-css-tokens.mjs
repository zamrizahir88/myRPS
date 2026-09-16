#!/usr/bin/env node
/**
 * Every var(--token) used in a component must be defined in index.css.
 * A dangling one does not error — the browser just drops the declaration, so
 * gridlines silently disappear and a progress track stays white in dark mode.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
// Match a declaration anywhere, not just at the start of a line — several
// tokens share a line — but not a var(--x) reference.
const defined = new Set(
  [...readFileSync(join(src, 'index.css'), 'utf8').matchAll(/(?<!var\()(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
)
// set inline by the component that consumes it
defined.add('--ring-length')

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') || p.endsWith('.ts') ? [p] : []
  })

let bad = false
for (const file of walk(src)) {
  for (const m of readFileSync(file, 'utf8').matchAll(/var\((--[a-z0-9-]+)\)/g)) {
    if (!defined.has(m[1])) {
      console.error(`${file.replace(src, 'src')}: ${m[1]} is not defined in index.css`)
      bad = true
    }
  }
}
console.log(bad ? 'dangling CSS tokens found' : `all CSS tokens defined (${defined.size} known)`)
process.exit(bad ? 1 : 0)

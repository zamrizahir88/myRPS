#!/usr/bin/env node
/**
 * Every form sheet in the app is a Modal whose onClose is an inline arrow, so
 * its identity changes on every render. When the sheet's effect depended on
 * that identity, one keystroke tore the effect down, and its cleanup pushed a
 * history.back() whose popstate landed on the freshly-registered listener and
 * closed the sheet — you typed one letter and the box vanished.
 *
 * This drives the real component in a browser:
 *   npm run dev -- --port 5182     (in another terminal)
 *   node scripts/check-modal.mjs
 */
import { chromium } from 'playwright'

const URL = process.env.MODAL_URL ?? 'http://localhost:5182/myRPS/modal-test.html'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage()
const failures = []
const pass = (m) => console.log(`  PASS: ${m}`)
const fail = (m) => { failures.push(m); console.log(`  FAIL: ${m}`) }

await page.goto(URL, { waitUntil: 'networkidle' })

// ---- typing must not close the sheet ---------------------------------------
await page.click('#open')
await page.waitForSelector('#activity')
await page.type('#activity', 'Program Khidmat Masyarakat', { delay: 20 })
await page.waitForTimeout(400)   // popstate is async; give it time to misfire

if (await page.isVisible('#activity')) {
  pass('the sheet stays open while you type')
  const value = await page.inputValue('#activity')
  value === 'Program Khidmat Masyarakat'
    ? pass('every keystroke is kept')
    : fail(`typed text was lost — the box holds "${value}"`)
} else {
  fail('the sheet closed itself while typing')
}

// ---- saving still works -----------------------------------------------------
if (await page.isVisible('#save')) {
  await page.click('#save')
  await page.waitForTimeout(200)
  ;(await page.textContent('#saved')) === 'Program Khidmat Masyarakat'
    ? pass('save keeps what you typed')
    : fail('save lost the text')
  ;(await page.isVisible('#activity'))
    ? fail('the sheet stayed open after saving')
    : pass('the sheet closes on save')
}

// ---- the back button closes the sheet, it does not leave the page ----------
await page.click('#open')
await page.waitForSelector('#activity')
await page.type('#activity', 'Sukan', { delay: 20 })
await page.goBack()
await page.waitForTimeout(400)
if (await page.isVisible('#open')) {
  ;(await page.isVisible('#activity'))
    ? fail('back did not close the sheet')
    : pass('back closes the sheet without leaving the page')
} else {
  fail('back left the page entirely')
}

// ---- Escape closes it too ---------------------------------------------------
await page.click('#open')
await page.waitForSelector('#activity')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
;(await page.isVisible('#activity')) ? fail('Escape did not close the sheet') : pass('Escape closes the sheet')

// ---- and the history entry is not left behind -------------------------------
// Two real navigations first, so there is somewhere to go back TO. A sheet
// that was saved or cancelled must leave the stack exactly as it found it:
// one back press then lands on the previous screen, not on this one again.
await page.evaluate(() => { window.location.hash = '#screen-a' })
await page.evaluate(() => { window.location.hash = '#screen-b' })
await page.waitForTimeout(100)

await page.click('#open')
await page.waitForSelector('#activity')
await page.type('#activity', 'Kokurikulum', { delay: 20 })
await page.click('#save')
await page.waitForTimeout(300)

await page.goBack()
await page.waitForTimeout(300)
const landed = '#' + (page.url().split('#')[1] ?? '')
landed === '#screen-a'
  ? pass('a saved sheet leaves no stray history entry')
  : fail(`back after saving landed on "${landed}" — a stray history entry was kept`)

await browser.close()
console.log(failures.length ? `\n${failures.length} failing` : '\nModal behaviour OK')
process.exit(failures.length ? 1 : 0)

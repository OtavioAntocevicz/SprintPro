import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const logoPath = join(root, 'public/logo.svg')
const outDir = join(root, 'public')

const sizes = [
  { name: 'pwa-192x192.png', size: 192, purpose: 'any' },
  { name: 'pwa-512x512.png', size: 512, purpose: 'any' },
  { name: 'apple-touch-icon.png', size: 180, purpose: 'any' },
  { name: 'pwa-512x512-maskable.png', size: 512, purpose: 'maskable' },
]

await mkdir(outDir, { recursive: true })
const svg = await readFile(logoPath)

for (const { name, size } of sizes) {
  const output = join(outDir, name)
  await sharp(svg, { density: 300 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(output)
  console.log(`generated ${name}`)
}

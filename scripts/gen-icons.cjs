// Генерация иконок из build/icon.svg
const sharp = require('sharp')
const pngToIco = require('png-to-ico').default || require('png-to-ico')
const fs = require('fs')
const path = require('path')

async function main() {
const root = path.join(__dirname, '..')
const svg = path.join(root, 'build', 'icon.svg')
const outDir = path.join(root, 'build')

  // PNG 512 (для окна) и 256 (для иконок)
  await sharp(svg).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'))
  const png256 = path.join(outDir, 'icon-256.png')
  await sharp(svg).resize(256, 256).png().toFile(png256)

  // ICO (Windows) — список размеров
  const icoBuf = await pngToIco([
    path.join(outDir, 'icon-256.png'),
    path.join(outDir, 'icon-256.png')
  ])
  fs.writeFileSync(path.join(outDir, 'icon.ico'), icoBuf)

  console.log('Иконки готовы:')
  console.log('  - build/icon-512.png')
  console.log('  - build/icon-256.png')
  console.log('  - build/icon.ico')
}

main().catch(e => { console.error(e); process.exit(1) })
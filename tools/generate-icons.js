// One-time PWA icon generation from the school logo. Run with:
//   node tools/generate-icons.js
const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '../client/src/assets/logo-source.png');
const OUT = path.join(__dirname, '../client/public/icons');
const THEME_BG = '#1e3a8a'; // matches Header.js's navy gradient

async function run() {
  // Standard (transparent-safe) icons — logo as-is, scaled to fit.
  await sharp(SRC).resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png().toFile(path.join(OUT, 'icon-192.png'));
  await sharp(SRC).resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png().toFile(path.join(OUT, 'icon-512.png'));

  // Maskable icon — needs the logo well within the safe zone (~80% of canvas)
  // since OS icon masks (circle, squircle, etc.) can crop up to ~10% from each edge.
  await sharp(SRC).resize(410, 410, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({ top: 51, bottom: 51, left: 51, right: 51, background: THEME_BG })
    .png().toFile(path.join(OUT, 'icon-maskable-512.png'));

  // Apple touch icon — iOS doesn't render transparency on home screen icons well,
  // so flatten onto the theme background.
  await sharp(SRC).resize(160, 160, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .extend({ top: 10, bottom: 10, left: 10, right: 10, background: THEME_BG })
    .png().toFile(path.join(OUT, 'apple-touch-icon.png'));

  console.log('Icons generated in', OUT);
}

run().catch((e) => { console.error(e); process.exit(1); });

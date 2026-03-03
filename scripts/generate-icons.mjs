/**
 * Generates PWA PNG icons from the SVG source at public/icons/icon.svg.
 *
 * Requirements:
 *   pnpm add -D sharp
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * Output files (placed in public/icons/):
 *   icon-192x192.png           — standard icon
 *   icon-512x512.png           — large icon
 *   icon-maskable-512x512.png  — maskable icon (extra padding for safe zone)
 *   apple-touch-icon.png       — 180×180 for iOS home screen
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SVG_PATH = path.join(ROOT, "public", "icons", "icon.svg");
const OUT_DIR = path.join(ROOT, "public", "icons");

if (!existsSync(SVG_PATH)) {
  console.error("❌  SVG source not found at public/icons/icon.svg");
  process.exit(1);
}

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error(
    "❌  sharp is not installed. Run: pnpm add -D sharp\n" +
      "   Then re-run: node scripts/generate-icons.mjs"
  );
  process.exit(1);
}

const svgBuffer = readFileSync(SVG_PATH);

const icons = [
  { name: "icon-192x192.png",          size: 192, padding: 0 },
  { name: "icon-512x512.png",          size: 512, padding: 0 },
  { name: "apple-touch-icon.png",      size: 180, padding: 0 },
  // Maskable icons need ~10% safe-zone padding so the logo fits in the circle crop
  { name: "icon-maskable-512x512.png", size: 512, padding: 52 },
];

for (const { name, size, padding } of icons) {
  const logoSize = size - padding * 2;
  const outPath = path.join(OUT_DIR, name);

  await sharp(svgBuffer)
    .resize(logoSize, logoSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 37, g: 99, b: 235, alpha: 1 }, // #2563eb
    })
    .png()
    .toFile(outPath);

  console.log(`✅  Generated ${name}  (${size}×${size})`);
}

console.log("\n🎉  All icons generated in public/icons/");

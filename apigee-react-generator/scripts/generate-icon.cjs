const sharp = require('sharp');
const path = require('path');

// Icon design - transparent background with strong contrast for visibility
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>

  <!-- Background hexagon - filled for visibility -->
  <polygon
    points="256,20 461,135 461,377 256,492 51,377 51,135"
    fill="#1a1a1a"
    stroke="#333333"
    stroke-width="8"
  />

  <!-- Inner hexagon outline -->
  <polygon
    points="256,80 401,165 401,347 256,432 111,347 111,165"
    fill="none"
    stroke="#444444"
    stroke-width="4"
  />

  <!-- Network lines -->
  <g stroke="#555555" stroke-width="5">
    <line x1="111" y1="256" x2="401" y2="256"/>
    <line x1="256" y1="80" x2="256" y2="256"/>
    <line x1="256" y1="80" x2="401" y2="165"/>
    <line x1="256" y1="80" x2="111" y2="165"/>
    <line x1="256" y1="432" x2="256" y2="256"/>
    <line x1="256" y1="432" x2="401" y2="347"/>
    <line x1="256" y1="432" x2="111" y2="347"/>
    <line x1="111" y1="165" x2="111" y2="347"/>
    <line x1="401" y1="165" x2="401" y2="347"/>
    <line x1="111" y1="165" x2="256" y2="256"/>
    <line x1="401" y1="165" x2="256" y2="256"/>
    <line x1="111" y1="347" x2="256" y2="256"/>
    <line x1="401" y1="347" x2="256" y2="256"/>
  </g>

  <!-- Accent lines - thicker for visibility -->
  <g stroke="url(#accentGrad)" stroke-width="10" stroke-linecap="round">
    <line x1="256" y1="80" x2="401" y2="165"/>
    <line x1="401" y1="165" x2="401" y2="256"/>
    <line x1="401" y1="256" x2="256" y2="256"/>
    <line x1="256" y1="256" x2="111" y2="347"/>
    <line x1="111" y1="347" x2="256" y2="432"/>
  </g>

  <!-- Network nodes - larger for visibility -->
  <g fill="#e5e5e5">
    <circle cx="256" cy="256" r="28" fill="url(#accentGrad)"/>
    <circle cx="256" cy="80" r="20"/>
    <circle cx="256" cy="432" r="20"/>
    <circle cx="111" cy="165" r="16"/>
    <circle cx="401" cy="165" r="16"/>
    <circle cx="111" cy="347" r="16"/>
    <circle cx="401" cy="347" r="16"/>
    <circle cx="111" cy="256" r="14"/>
    <circle cx="401" cy="256" r="14" fill="url(#accentGrad)"/>
  </g>
</svg>`;

async function generateIcon() {
  const iconsDir = path.join(__dirname, '../src-tauri/icons');
  const outputPath = path.join(iconsDir, 'icon.png');

  console.log('Generating new icon.png...');

  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toFile(outputPath);

  console.log(`✓ Icon generated: ${outputPath}`);
}

generateIcon().catch(console.error);

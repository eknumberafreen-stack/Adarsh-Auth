const fs = require('fs');
const path = require('path');

const frontendDir = path.resolve(__dirname, '..');
const nextDir = path.join(frontendDir, '.next');
const standaloneDir = path.join(nextDir, 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.log('[prepare-standalone] No .next/standalone output found, skipping copy.');
  process.exit(0);
}

const staticSrc = path.join(nextDir, 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');

if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.dirname(staticDest), { recursive: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
  console.log('[prepare-standalone] Copied .next/static -> .next/standalone/.next/static');
}

const publicSrc = path.join(frontendDir, 'public');
const publicDest = path.join(standaloneDir, 'public');

if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
  console.log('[prepare-standalone] Copied public -> .next/standalone/public');
}

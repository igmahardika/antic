// scripts/audit-routes-and-dates.ts
import fg from 'fast-glob';
import fs from 'fs';

const files = fg.sync(['src/**/*.{ts,tsx}'], { dot: true });
let dup = 0; let extRoutes = 0;

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (/function\s+parseDateSafe\s*\(/.test(s) && !f.endsWith('src/utils/date.ts')) {
    console.log('Duplicate parseDateSafe in', f); dup++;
  }
  if (/<Route\s+path=/.test(s) && !f.includes('src/routes/manifest')) {
    console.log('Route defined outside manifest:', f); extRoutes++;
  }
}

if (dup > 0 || extRoutes > 0) {
  console.error(`Audit failed: duplicate parseDateSafe=${dup}, external routes=${extRoutes}`);
  process.exit(1);
} else {
  console.log('Audit passed');
}

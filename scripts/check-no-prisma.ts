import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * CI guardrail: Prisma is gone only when it is un-referenceable.
 *
 * This intentionally scans source, scripts and tests. It does not scan the
 * historical `prisma/` directory while it still exists, `.hermes` plans, or
 * package-lock noise. Once the migration is complete, deleting `prisma/` and
 * the Prisma packages is enforced by this check plus package.json scripts.
 */
const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'scripts', 'tests'];
const FORBIDDEN = [
  /@prisma\/client/,
  /\bPrismaClient\b/,
  /from\s+['"]@\/server\/db['"]/,
  /requireDb\s*\(/,
  /\bprisma\./,
];

const failures: string[] = [];

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
      walk(path);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|mts|cts)$/.test(entry)) continue;
    const body = readFileSync(path, 'utf8');
    for (const pattern of FORBIDDEN) {
      const match = body.match(pattern);
      if (match) {
        const line = body.slice(0, match.index).split(/\r?\n/).length;
        failures.push(`${path}:${line} matches ${pattern}`);
      }
    }
  }
}

for (const dir of SCAN_DIRS) {
  walk(join(ROOT, dir));
}

if (failures.length > 0) {
  console.error('Prisma references remain:');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log('No Prisma references in src, scripts or tests.');

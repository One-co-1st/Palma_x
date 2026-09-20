import Module from 'node:module';

type ModuleLoad = (this: unknown, request: string, ...args: unknown[]) => unknown;

const moduleWithLoad = Module as unknown as { _load: ModuleLoad };
const originalLoad = moduleWithLoad._load;
moduleWithLoad._load = function (this: unknown, request: string, ...args: unknown[]) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, ...args);
};

/**
 * Run the retention sweep by hand.
 *
 *   npm run retention
 *
 * The same code path as the scheduled route, so what it removes here is
 * exactly what it removes there.
 */
async function main() {
  const { runRetentionSweep } = await import('../src/server/services/retention');
  const result = await runRetentionSweep({ label: 'command line' });

  console.log(`Retention sweep — ${result.ranAt}`);
  for (const [rule, count] of Object.entries(result.removed)) {
    console.log(`  ${rule.padEnd(26)} ${count}`);
  }
  console.log(`  ${'total'.padEnd(26)} ${result.total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { closeSql } = await import('../src/server/db/sql');
    await closeSql();
  });

import { loadEnvConfig } from '@next/env';
import Module from 'node:module';
import postgres from 'postgres';

type ModuleLoad = (this: unknown, request: string, ...args: unknown[]) => unknown;

const moduleWithLoad = Module as unknown as { _load: ModuleLoad };
const originalLoad = moduleWithLoad._load;
moduleWithLoad._load = function (this: unknown, request: string, ...args: unknown[]) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, ...args);
};

loadEnvConfig(process.cwd());

let count = 0;
const byShape = new Map<string, number>();

const profileSql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  prepare: false,
  debug: (_connection, query) => {
    count += 1;
    const shape = query.replace(/"[^"]+"/g, '?').replace(/\s+/g, ' ').slice(0, 180);
    byShape.set(shape, (byShape.get(shape) ?? 0) + 1);
  },
});

(globalThis as unknown as { palmaSql?: postgres.Sql }).palmaSql = profileSql;

async function main() {
  const started = Date.now();
  const queries = await import('../src/server/data/queries');

  async function time<T>(label: string, run: () => Promise<T>): Promise<T> {
    const before = count;
    const startedAt = Date.now();
    const result = await run();
    console.log(`${label}: wall=${Date.now() - startedAt}ms queries=${count - before}`);
    return result;
  }

  await time('getCurrentSeason', () => queries.getCurrentSeason());
  await time('listCategories(current)', async () => queries.listCategories((await queries.getCurrentSeason()).year));
  await time('listCreators honoursOnly limit 4', () => queries.listCreators({ honoursOnly: true, limit: 4 }));
  await time('listRecentHonours(5)', () => queries.listRecentHonours(5));
  await time('getRollOfHonour', () => queries.getRollOfHonour());
  await time('listArticles limit 3', () => queries.listArticles({ limit: 3 }));
  await time('listCreators limit 120', () => queries.listCreators({ limit: 120 }));
  await time('listCountries', () => queries.listCountries());

  console.log(`TOTAL: wall=${Date.now() - started}ms queries=${count}`);
  console.log('\nTop query shapes:');
  for (const [shape, shapeCount] of [...byShape.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`${shapeCount}x :: ${shape}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await profileSql.end({ timeout: 5 });
  });

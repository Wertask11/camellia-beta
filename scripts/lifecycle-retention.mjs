/** Private operator job. No scheduler or Production activation. Counts/digest only; no record bodies. */
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
const [collection, ...args] = process.argv.slice(2),
  apply = args.includes('--apply'),
  review = args.find((a) => a.startsWith('--review=')),
  after = args.find((a) => a.startsWith('--after=')),
  digest = args.find((a) => !a.startsWith('--'));
if (
  !collection ||
  args.filter((a) => !a.startsWith('--')).length > 1 ||
  args.some(
    (a) =>
      a.startsWith('--') &&
      a !== '--apply' &&
      !a.startsWith('--after=') &&
      !a.startsWith('--review=') &&
      !a.startsWith('--record='),
  )
)
  throw Error(
    'Usage: lifecycle-retention <fixed collection> [digest] [--apply] [--after=id] | --review=private.json --record=id',
  );
if (
  (apply || review) &&
  process.env.CAMELLIA_OPERATOR_CHANGE_APPROVED !== 'true'
)
  throw Error('Explicit operator approval required');
const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
});
try {
  const { serverAdmin } = await vite.ssrLoadModule('/lib/server/admin.ts'),
    { lifecycleCleanup, reviewRetentionDisposition } = await vite.ssrLoadModule(
      '/lib/server/lifecycle-retention.ts',
    );
  const { db } = serverAdmin();
  const result = review
    ? await reviewRetentionDisposition(
        db,
        collection,
        args.find((a) => a.startsWith('--record='))?.slice(9),
        JSON.parse(await readFile(review.slice(9), 'utf8')),
      )
    : await lifecycleCleanup(db, collection, {
        apply,
        approvedDigest: digest,
        after: after?.slice(8),
      });
  console.log(JSON.stringify(result));
} finally {
  await vite.close();
}

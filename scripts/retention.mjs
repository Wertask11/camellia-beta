/** Operational expiry job. Dry-run by default; no scheduler is installed or enabled. */
import { createServer } from 'vite';
const [collection, ...args] = process.argv.slice(2),
  digest = args.find((v) => !v.startsWith('--')),
  flags = args.filter((v) => v.startsWith('--')),
  apply = flags.includes('--apply');
if (
  !collection ||
  args.filter((v) => !v.startsWith('--')).length > 1 ||
  flags.some((f) => f !== '--apply' && !f.startsWith('--after='))
)
  throw new Error(
    'Usage: node scripts/retention.mjs <allowed collection> [approved plan digest] [--apply]',
  );
if (apply && process.env.CAMELLIA_OPERATOR_CHANGE_APPROVED !== 'true')
  throw new Error('Explicit operator approval required');
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
});
try {
  const { serverAdmin } = await server.ssrLoadModule('/lib/server/admin.ts'),
    { expiryCleanup } = await server.ssrLoadModule('/lib/server/retention.ts');
  console.log(
    JSON.stringify(
      await expiryCleanup(serverAdmin().db, collection, {
        apply,
        approvedDigest: digest,
        after: flags.find((f) => f.startsWith('--after='))
          ? JSON.parse(
              Buffer.from(
                flags.find((f) => f.startsWith('--after=')).slice(8),
                'base64url',
              ).toString(),
            )
          : undefined,
      }),
    ),
  );
} finally {
  await server.close();
}

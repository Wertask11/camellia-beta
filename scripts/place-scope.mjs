/** Explicit operator action, dry-run by default. Never called by the application or builds. */
import { createServer } from 'vite';
const [actorUid, targetUid, slugList, reason, ...flags] = process.argv.slice(2),
  apply = flags.includes('--apply');
if (
  !actorUid ||
  !targetUid ||
  slugList === undefined ||
  !reason ||
  flags.some((f) => f !== '--apply')
)
  throw new Error(
    'Usage: node scripts/place-scope.mjs <operator UID> <staff UID> <slug,slug|-> <reason> [--apply]',
  );
if (apply && process.env.CAMELLIA_OPERATOR_CHANGE_APPROVED !== 'true')
  throw new Error(
    'Explicit operational approval required; dry-run is the default',
  );
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
});
try {
  const { serverAdmin } = await server.ssrLoadModule('/lib/server/admin.ts'),
    { changePlaceScope } = await server.ssrLoadModule(
      '/lib/place/scope-service.ts',
    ),
    { db, auth } = serverAdmin();
  const result = await changePlaceScope(db, auth, {
    actorUid,
    targetUid,
    slugs: slugList === '-' ? [] : slugList.split(','),
    reason,
    apply,
  });
  console.log(JSON.stringify(result));
} finally {
  await server.close();
}

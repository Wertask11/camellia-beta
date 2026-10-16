import type { TreeLeaf } from '@/types';
export function treeOverview(leaves: TreeLeaf[], now = new Date()) {
  const visible = leaves.filter((leaf) => leaf.status !== 'removed');
  const recentAdded = [...visible]
    .filter((l) => Date.parse(l.createdAt) <= +now)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  const reflected = visible
    .flatMap((leaf) =>
      leaf.reflections
        .filter((r) => Date.parse(r.createdAt) <= +now)
        .map((reflection) => ({ leaf, reflection })),
    )
    .sort((a, b) =>
      b.reflection.createdAt.localeCompare(a.reflection.createdAt),
    )
    .slice(0, 3);
  const counts = new Map<string, number>();
  for (const leaf of visible)
    for (const tag of new Set(leaf.meaningTags))
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return {
    recentAdded,
    reflected,
    tags: [...counts].filter(([, n]) => n >= 2).map(([tag]) => tag),
  };
}

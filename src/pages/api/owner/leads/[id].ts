import type { APIContext } from 'astro';
import { getDb, json, nowIso, readBody, requireAuth } from '@/lib/server/auth';

export const prerender = false;

/** The owner follow-up vocabulary (mirrors leadStatusMeta in lib/owner.ts). */
const ALLOWED = new Set(['new', 'contacted', 'interested', 'not_interested']);

/**
 * PATCH /api/owner/leads/[id] — move a lead through the follow-up workflow.
 *
 * Authority comes from the listing: the lead must belong to one of the
 * caller's own listings, so a guessed lead id can never update someone
 * else's inbox. `meta.changes` is typed loosely upstream, so narrow it.
 */
export async function PATCH(context: APIContext) {
  const auth = await requireAuth(context);
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'owner' && !auth.user.is_admin) {
    return json({ error: 'Owner access required.' }, 403);
  }

  const id = Number(context.params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'Missing lead id.' }, 400);

  const body = await readBody(context);
  const status = String(body?.status ?? '').trim();
  if (!ALLOWED.has(status)) return json({ error: 'Unknown lead status.' }, 400);

  const res = await getDb()
    .prepare(
      `UPDATE leads SET status = ?, updated_at = ?
       WHERE id = ? AND property_id IN (SELECT id FROM owner_listings WHERE owner_id = ?)`
    )
    .bind(status, nowIso(), id, auth.user.id)
    .run();

  const changes = res.meta?.changes;
  if (typeof changes !== 'number' || changes === 0) return json({ error: 'Lead not found.' }, 404);
  return json({ ok: true, status });
}

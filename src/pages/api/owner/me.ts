import type { APIContext } from 'astro';
import { getDb, json, publicUser, requireAuth } from '@/lib/server/auth';
import { fetchListing, listingDto, type ListingRow } from '@/lib/server/listings';
import { mediaUrl } from '@/lib/server/media';

export const prerender = false;

interface VerificationDocRow {
  id: string;
  owner_id: string;
  listing_id: string | null;
  doc_type: string;
  file_key: string;
  file_name: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

/** Backend for the PG Owner landing page (after auth). */
export async function GET(context: APIContext) {
  const auth = await requireAuth(context);
  if ('error' in auth) return auth.error;
  const user = auth.user;
  if (user.role !== 'owner' && !user.is_admin) {
    return json({ error: 'Owner access required.' }, 403);
  }

  const db = getDb();
  const listingsRes = await db
    .prepare('SELECT * FROM owner_listings WHERE owner_id = ? ORDER BY updated_at DESC')
    .bind(user.id)
    .all<ListingRow>();
  const leadsRes = await db
    .prepare(
      `SELECT l.*, ol.name AS property_name
       FROM leads l
       LEFT JOIN owner_listings ol ON ol.id = l.property_id
       WHERE l.property_id IN (SELECT id FROM owner_listings WHERE owner_id = ?)
       ORDER BY l.created_at DESC`
    )
    .bind(user.id)
    .all<{ id: number; property_id: string; property_name: string | null; budget: string | null; move_in_month: string | null; message: string | null; source: string; status: string; created_at: string }>();
  const docsRes = await db
    .prepare('SELECT * FROM verification_documents WHERE owner_id = ? ORDER BY created_at DESC')
    .bind(user.id)
    .all<VerificationDocRow>();

  const listings = await Promise.all(
    listingsRes.results.map(async (row) => {
      const full = await fetchListing(db, row.id);
      return full ? listingDto(full.row, full.rooms, full.media, mediaUrl) : null;
    })
  );

  const docs = docsRes.results.map((d) => ({
    id: d.id,
    listingId: d.listing_id,
    docType: d.doc_type,
    fileName: d.file_name,
    url: mediaUrl(d.file_key),
    status: d.status,
    notes: d.notes,
    createdAt: d.created_at,
  }));

  const verificationStatus: 'none' | 'pending' | 'approved' =
    docs.some((d) => d.status === 'pending')
      ? 'pending'
      : docs.length > 0 && docs.every((d) => d.status === 'approved')
        ? 'approved'
        : 'none';

  return json({
    user: publicUser(user),
    stats: {
      listings: listingsRes.results.length,
      activeListings: listingsRes.results.filter((l) => l.status === 'active').length,
      pendingListings: listingsRes.results.filter((l) => l.status === 'pending').length,
      leads: leadsRes.results.length,
      newLeads: leadsRes.results.filter((l) => l.status === 'new').length,
      verification: { status: verificationStatus, documents: docs.length },
    },
    listings: listings.filter(Boolean),
    leads: leadsRes.results,
  });
}

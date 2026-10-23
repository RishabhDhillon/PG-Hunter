-- PG Hunter — per-listing contact opt-in (talk-to-owner feature).
--
-- Students could only send an enquiry and hope; the owner had no way to offer
-- a direct channel. Each listing now carries two opt-in flags so the owner
-- decides — per property — whether students may see a WhatsApp deep link
-- and/or their phone number. The number itself stays on users.phone; these
-- columns only gate whether the public read may join it.
--
-- Both default to 0 on purpose: applying this migration must not start
-- exposing existing owners' numbers before they have opted in.
ALTER TABLE owner_listings ADD COLUMN contact_whatsapp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE owner_listings ADD COLUMN contact_show_phone INTEGER NOT NULL DEFAULT 0;
